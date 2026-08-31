/* ============================================================================
   Migration : เปลี่ยนคำสะกด "Karl Fisher" -> "Karl Fischer"

   ขอบเขต
     Instrument  : 'Water content (Karl Fisher)'        -> 'Water content (Karl Fischer)'
     ItemName    : 'Water content by Karl Fisher'       -> 'Water content by Karl Fischer'
     ReportName  : 'Water content by Karl Fisher (ppm)' -> 'Water content by Karl Fischer (ppm)'
     ตาราง       : [dbo].[Instrument_Water content (Karl Fisher)]
                   -> [dbo].[Instrument_Water content (Karl Fischer)]
     คอลัมน์      : [Id_Water content (Karl Fisher)]
                   -> [Id_Water content (Karl Fischer)]

   ทำไมต้อง rename ตาราง/คอลัมน์ด้วย
     QO-BACK/flow/Page1/QOMAIN.js ประกอบชื่อจากค่า Instrument ตรง ๆ
       _qoInstrumentTableName()  -> `Instrument_${instrument}`   (บรรทัด ~4572)
       _qoInstrumentIdColumn()   -> `Id_${instrument}`           (บรรทัด ~4577)
     ถ้าแก้แต่ข้อมูลโดยไม่ rename ตาราง ทุก endpoint ที่ใช้ helper นี้จะพัง
     (listItem / returnItem / deleteItem / saveResult / approve / picture ...)

   *** ต้อง deploy โค้ดที่แก้ hard-coded string พร้อมกับ script นี้ ***
     QO-BACK/flow/Page1/QOMAIN.js                                  บรรทัด 3567
     QO-FRONT/lib/page/P20CREATEREQUEST/P20CREATEREQUESTMAIN.dart  บรรทัด 25, 36
     QO-FRONT/.../P30WATERCONTENTKARLFISHERVAR.dart                บรรทัด 7
     QO-BACK/sql/cleanup_orphan_instrument_rows.sql                บรรทัด 53, 54, 93
   (ส่วน _isKarlFischerItemName / QO_KARL_FISCHER_ITEM_NAME_KEYS รองรับสองสะกด
    อยู่แล้ว ไม่ต้องแก้ และห้ามแตะคอลัมน์ MasterPattern.[LOQ_Karlfischer])

   วิธีใช้
     STEP 0 : ตรวจสภาพปัจจุบัน (read-only)
     STEP 1 : ดูจำนวนแถวที่จะกระทบ (read-only)
     STEP 2 : รันจริง — ตั้งต้นเป็น ROLLBACK ให้ดูตัวเลขใน Messages ก่อน
              แล้วค่อยสลับบรรทัดท้ายเป็น COMMIT
     STEP 3 : ตรวจผลหลัง COMMIT
     STEP 4 : rollback กลับเป็น Fisher (ถ้าจำเป็น)

   ก่อนรัน
     - หยุด service QO-BACK กัน request เข้ามาระหว่างแก้
     - BACKUP DATABASE [QO] หรืออย่างน้อย backup 5 ตารางที่ STEP 2 แตะ

   ---------------------------------------------------------------------------
   ประวัติการรัน
   (ยังไม่เคยรัน)
   ============================================================================ */

USE [QO];
GO


/* ---------------------------------------------------------------------------
   STEP 0 : ตรวจสภาพปัจจุบัน (read-only)
   --------------------------------------------------------------------------- */

-- 0.1 ตารางต้นทางต้องมี / ตารางปลายทางต้องยังไม่มี
SELECT  N'Instrument_Water content (Karl Fisher)'  AS TableName,
        CASE WHEN OBJECT_ID(N'[dbo].[Instrument_Water content (Karl Fisher)]', N'U')  IS NULL
             THEN N'MISSING' ELSE N'OK' END        AS Status
UNION ALL
SELECT  N'Instrument_Water content (Karl Fischer)',
        CASE WHEN OBJECT_ID(N'[dbo].[Instrument_Water content (Karl Fischer)]', N'U') IS NULL
             THEN N'OK (ยังไม่มี ถูกต้อง)' ELSE N'CONFLICT! มีอยู่แล้ว' END;

-- 0.2 คอลัมน์ในตาราง Instrument_* (ดูว่ามี Id_... จริงไหม และ identity อยู่คอลัมน์ไหน)
SELECT  c.column_id, c.name AS ColumnName, ty.name AS DataType,
        c.max_length, c.is_identity, c.is_nullable
FROM    sys.columns c
JOIN    sys.types  ty ON ty.user_type_id = c.user_type_id
WHERE   c.object_id = OBJECT_ID(N'[dbo].[Instrument_Water content (Karl Fisher)]', N'U')
ORDER BY c.column_id;

-- 0.3 index / constraint ที่ชื่อยังมีคำว่า Fisher
--     (ไม่ทำให้พัง แต่ชื่อจะเพี้ยน — จะ rename ตามหรือไม่ก็ได้)
SELECT N'INDEX' AS ObjType, i.name AS ObjName, OBJECT_NAME(i.object_id) AS OnTable
FROM   sys.indexes i
WHERE  i.name LIKE N'%Fisher%' AND i.name NOT LIKE N'%Fischer%'
UNION ALL
SELECT N'CONSTRAINT', o.name, OBJECT_NAME(o.parent_object_id)
FROM   sys.objects o
WHERE  o.parent_object_id > 0
  AND  o.name LIKE N'%Fisher%' AND o.name NOT LIKE N'%Fischer%';

-- 0.4 view / proc / function ที่อ้างชื่อเก่า (ถ้ามี ต้องแก้เอง script นี้ไม่แตะ)
SELECT o.type_desc, OBJECT_SCHEMA_NAME(m.object_id) AS SchemaName,
       OBJECT_NAME(m.object_id) AS ObjName
FROM   sys.sql_modules m
JOIN   sys.objects o ON o.object_id = m.object_id
WHERE  m.definition LIKE N'%Karl Fisher%';

-- 0.5 ตาราง backup เก่าที่อาจค้างอยู่ (script นี้ไม่แตะ — ตั้งใจ)
SELECT name FROM sys.tables WHERE name LIKE N'%Karl Fisher%';
GO


/* ---------------------------------------------------------------------------
   STEP 1 : ดูจำนวนแถวที่จะกระทบ (read-only)

   ใช้ collation Latin1_General_BIN2 เพื่อเทียบแบบ case-sensitive
   จะได้ไม่ไปโดนค่าที่สะกดตัวพิมพ์ต่างกันโดยไม่ตั้งใจ
   --------------------------------------------------------------------------- */

SELECT N'Request.Instrument'          AS Target, COUNT(*) AS AffectedRows FROM [dbo].[Request]
WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'Request.ItemName',           COUNT(*) FROM [dbo].[Request]
WHERE [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'Request.ReportName',         COUNT(*) FROM [dbo].[Request]
WHERE [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterPattern.Instrument',   COUNT(*) FROM [dbo].[MasterPattern]
WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterPattern.ItemName',     COUNT(*) FROM [dbo].[MasterPattern]
WHERE [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterPattern.ReportName',   COUNT(*) FROM [dbo].[MasterPattern]
WHERE [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterInstrument.Instrument', COUNT(*) FROM [dbo].[MasterInstrument]
WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterItemName.ItemName',    COUNT(*) FROM [dbo].[MasterItemName]
WHERE [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'Instrument_*.Instrument',    COUNT(*) FROM [dbo].[Instrument_Water content (Karl Fisher)]
WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'Instrument_*.ItemName',      COUNT(*) FROM [dbo].[Instrument_Water content (Karl Fisher)]
WHERE [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'Instrument_*.ReportName',    COUNT(*) FROM [dbo].[Instrument_Water content (Karl Fisher)]
WHERE [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%';

-- ค่าที่แตกต่างกันทั้งหมดที่จะถูกแทนที่ (ดูให้แน่ใจว่าไม่มีค่าแปลกปลอมติดมา)
-- หมายเหตุ : ItemName ใน master มีช่องว่างท้ายค่า จึงต้องใช้ REPLACE ไม่ใช่ =
SELECT DISTINCT N'Request.Instrument' AS Col, [Instrument] AS OldValue,
       REPLACE([Instrument] COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer') AS NewValue
FROM   [dbo].[Request] WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION
SELECT DISTINCT N'Request.ItemName', [ItemName],
       REPLACE([ItemName] COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer')
FROM   [dbo].[Request] WHERE [ItemName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION
SELECT DISTINCT N'Request.ReportName', [ReportName],
       REPLACE([ReportName] COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer')
FROM   [dbo].[Request] WHERE [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION
SELECT DISTINCT N'MasterPattern.ReportName', [ReportName],
       REPLACE([ReportName] COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer')
FROM   [dbo].[MasterPattern] WHERE [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%';
GO


/* ---------------------------------------------------------------------------
   STEP 2 : รันจริง

   ลำดับสำคัญ — ต้องอยู่ใน transaction เดียวกันทั้งหมด
     2.1 rename คอลัมน์ Id_...           (ใช้ชื่อตารางเก่า)
     2.2 rename ตาราง Instrument_...
     2.3 UPDATE ข้อความในตาราง Instrument_* (ชื่อใหม่)
     2.4 UPDATE Request
     2.5 UPDATE MasterPattern
     2.6 UPDATE MasterInstrument
     2.7 UPDATE MasterItemName

   ถ้าแยกรันคนละ transaction จะมีช่วงที่ Request.Instrument ไม่ตรงกับแถวใน
   Instrument_* -> duplicateCheckColumns ของ /QO/listItem (QOMAIN.js ~1651)
   จะ match ไม่เจอ แล้ว insert แถวซ้ำ (ดู cleanup_orphan_instrument_rows.sql)

   ตั้งต้นเป็น ROLLBACK : ดูตัวเลขใน tab Messages ให้ตรงกับ STEP 1 ก่อน
   แล้วค่อยสลับสองบรรทัดสุดท้ายเป็น COMMIT TRANSACTION
   --------------------------------------------------------------------------- */

SET XACT_ABORT ON;
SET NOCOUNT ON;

DECLARE @OldFind  NVARCHAR(50) = N'Karl Fisher';
DECLARE @NewFind  NVARCHAR(50) = N'Karl Fischer';
DECLARE @OldTable SYSNAME      = N'Instrument_Water content (Karl Fisher)';
DECLARE @NewTable SYSNAME      = N'Instrument_Water content (Karl Fischer)';
DECLARE @OldIdCol SYSNAME      = N'Id_Water content (Karl Fisher)';
DECLARE @NewIdCol SYSNAME      = N'Id_Water content (Karl Fischer)';
DECLARE @colPath  NVARCHAR(776);
DECLARE @tblPath  NVARCHAR(776);
DECLARE @sql      NVARCHAR(MAX);
DECLARE @cnt      INT;

BEGIN TRANSACTION;
BEGIN TRY

    /* ---- guard ---------------------------------------------------------- */
    IF OBJECT_ID(N'[dbo].' + QUOTENAME(@OldTable), N'U') IS NULL
        RAISERROR(N'ไม่พบตารางต้นทาง : %s', 16, 1, @OldTable);

    IF OBJECT_ID(N'[dbo].' + QUOTENAME(@NewTable), N'U') IS NOT NULL
        RAISERROR(N'ตารางปลายทางมีอยู่แล้ว : %s — หยุดก่อน', 16, 1, @NewTable);

    /* ---- 2.1 rename คอลัมน์ Id_... (ทำเฉพาะถ้ามีจริง) -------------------- */
    IF COL_LENGTH(N'[dbo].' + QUOTENAME(@OldTable), @OldIdCol) IS NOT NULL
    BEGIN
        SET @colPath = N'[dbo].' + QUOTENAME(@OldTable) + N'.' + QUOTENAME(@OldIdCol);
        EXEC sp_rename @objname = @colPath, @newname = @NewIdCol, @objtype = 'COLUMN';
        PRINT N'2.1 rename column   -> ' + @NewIdCol;
    END
    ELSE
        PRINT N'2.1 ข้าม : ไม่มีคอลัมน์ ' + @OldIdCol
              + N' (โค้ดจะ fallback ไปใช้ identity หรือ Id ตาม _resolveQoInstrumentRecordIdColumn)';

    /* ---- 2.2 rename ตาราง ------------------------------------------------ */
    SET @tblPath = N'[dbo].' + QUOTENAME(@OldTable);
    EXEC sp_rename @objname = @tblPath, @newname = @NewTable, @objtype = 'OBJECT';
    PRINT N'2.2 rename table    -> ' + @NewTable;

    /* ---- 2.3 UPDATE ข้อความในตาราง Instrument_* -------------------------- */
    SET @sql = N'
        UPDATE [dbo].' + QUOTENAME(@NewTable) + N'
        SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @o, @n),
            [ItemName]   = REPLACE([ItemName]   COLLATE Latin1_General_BIN2, @o, @n),
            [ReportName] = REPLACE([ReportName] COLLATE Latin1_General_BIN2, @o, @n)
        WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N''%'' + @o + N''%''
           OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N''%'' + @o + N''%''
           OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N''%'' + @o + N''%'';
        SET @out = @@ROWCOUNT;';
    EXEC sp_executesql @sql,
         N'@o NVARCHAR(50), @n NVARCHAR(50), @out INT OUTPUT',
         @o = @OldFind, @n = @NewFind, @out = @cnt OUTPUT;
    PRINT N'2.3 Instrument_*    : ' + CONVERT(NVARCHAR(20), @cnt) + N' แถว';

    /* ---- 2.4 Request ----------------------------------------------------- */
    UPDATE [dbo].[Request]
    SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @OldFind, @NewFind),
        [ItemName]   = REPLACE([ItemName]   COLLATE Latin1_General_BIN2, @OldFind, @NewFind),
        [ReportName] = REPLACE([ReportName] COLLATE Latin1_General_BIN2, @OldFind, @NewFind)
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%'
       OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%'
       OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%';
    PRINT N'2.4 Request         : ' + CONVERT(NVARCHAR(20), @@ROWCOUNT) + N' แถว';

    /* ---- 2.5 MasterPattern ----------------------------------------------- */
    UPDATE [dbo].[MasterPattern]
    SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @OldFind, @NewFind),
        [ItemName]   = REPLACE([ItemName]   COLLATE Latin1_General_BIN2, @OldFind, @NewFind),
        [ReportName] = REPLACE([ReportName] COLLATE Latin1_General_BIN2, @OldFind, @NewFind)
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%'
       OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%'
       OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%';
    PRINT N'2.5 MasterPattern   : ' + CONVERT(NVARCHAR(20), @@ROWCOUNT) + N' แถว';

    /* ---- 2.6 MasterInstrument (ใช้หา Cost ตอนสร้าง request ~บรรทัด 587) --- */
    UPDATE [dbo].[MasterInstrument]
    SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @OldFind, @NewFind)
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%';
    PRINT N'2.6 MasterInstrument: ' + CONVERT(NVARCHAR(20), @@ROWCOUNT) + N' แถว';

    /* ---- 2.7 MasterItemName (dropdown /QO/getDropdown) -------------------- */
    UPDATE [dbo].[MasterItemName]
    SET [ItemName] = REPLACE([ItemName] COLLATE Latin1_General_BIN2, @OldFind, @NewFind)
    WHERE [ItemName] COLLATE Latin1_General_BIN2 LIKE N'%' + @OldFind + N'%';
    PRINT N'2.7 MasterItemName  : ' + CONVERT(NVARCHAR(20), @@ROWCOUNT) + N' แถว';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH

-- << ดูตัวเลขใน Messages ให้ตรงกับ STEP 1 ก่อน แล้วค่อยสลับสองบรรทัดนี้
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
-- IF @@TRANCOUNT > 0 COMMIT TRANSACTION;
GO


/* ---------------------------------------------------------------------------
   STEP 3 : ตรวจผลหลัง COMMIT
   --------------------------------------------------------------------------- */

-- 3.1 โครงสร้าง
SELECT N'ตารางชื่อใหม่มีแล้ว' AS Check_,
       CASE WHEN OBJECT_ID(N'[dbo].[Instrument_Water content (Karl Fischer)]', N'U') IS NULL
            THEN N'FAIL' ELSE N'PASS' END AS Result
UNION ALL
SELECT N'ตารางชื่อเก่าหายไป',
       CASE WHEN OBJECT_ID(N'[dbo].[Instrument_Water content (Karl Fisher)]', N'U') IS NULL
            THEN N'PASS' ELSE N'FAIL' END
UNION ALL
SELECT N'คอลัมน์ Id_ ชื่อใหม่',
       CASE WHEN COL_LENGTH(N'[dbo].[Instrument_Water content (Karl Fischer)]',
                            N'Id_Water content (Karl Fischer)') IS NULL
            THEN N'ไม่มี (ok ถ้าเดิมก็ไม่มี)' ELSE N'PASS' END;

-- 3.2 ข้อมูลตกค้าง — ทุกค่าควรเป็น 0
SELECT N'Request'           AS TableName, COUNT(*) AS LeftoverFisherRows FROM [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
    OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterPattern',    COUNT(*) FROM [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
    OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterInstrument', COUNT(*) FROM [dbo].[MasterInstrument]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterItemName',   COUNT(*) FROM [dbo].[MasterItemName]
WHERE  [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'Instrument_*',     COUNT(*) FROM [dbo].[Instrument_Water content (Karl Fischer)]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
    OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%';

-- 3.3 แถวใน Instrument_* ต้องยัง match กับ Request ด้วย key 6 คอลัมน์เดิมได้
--     MatchedWithRequest ควรเท่ากับ TotalRows (ถ้าน้อยกว่า = หลุด sync)
-- SQL Server ไม่ยอมให้ SUM() ครอบ subquery ตรง ๆ (Msg 130)
-- จึงคำนวณ flag ใน derived table ก่อนแล้วค่อย SUM
SELECT COUNT(*) AS TotalRows,
       SUM(m.Matched) AS MatchedWithRequest
FROM (
    SELECT CASE WHEN EXISTS (
             SELECT 1 FROM [dbo].[Request] s
             WHERE ISNULL(CONVERT(NVARCHAR(4000), t.[ReqNo]),      N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ReqNo]),      N'')
               AND ISNULL(CONVERT(NVARCHAR(4000), t.[SampleCode]), N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[SampleCode]), N'')
               AND ISNULL(CONVERT(NVARCHAR(4000), t.[Instrument]), N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[Instrument]), N'')
               AND ISNULL(CONVERT(NVARCHAR(4000), t.[ItemNo]),     N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ItemNo]),     N'')
               AND ISNULL(CONVERT(NVARCHAR(4000), t.[ItemName]),   N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ItemName]),   N'')
               AND ISNULL(CONVERT(NVARCHAR(4000), t.[ReportName]), N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ReportName]), N'')
           ) THEN 1 ELSE 0 END AS Matched
    FROM [dbo].[Instrument_Water content (Karl Fischer)] t
) m;
GO


/* ---------------------------------------------------------------------------
   STEP 4 : ROLLBACK — ย้อนกลับเป็น Fisher
            ใช้เมื่อ COMMIT ไปแล้วแต่ต้องถอย (เช่นโค้ด deploy ไม่ทัน)
            ตั้งต้นเป็น ROLLBACK เหมือนกัน ต้องสลับเป็น COMMIT เองถ้าจะใช้จริง
            *** เอา comment block ออกก่อนใช้ ***
   --------------------------------------------------------------------------- */
/*
SET XACT_ABORT ON;
SET NOCOUNT ON;

DECLARE @Find NVARCHAR(50) = N'Karl Fischer';
DECLARE @Repl NVARCHAR(50) = N'Karl Fisher';
DECLARE @sql  NVARCHAR(MAX);

BEGIN TRANSACTION;
BEGIN TRY

    IF COL_LENGTH(N'[dbo].[Instrument_Water content (Karl Fischer)]',
                  N'Id_Water content (Karl Fischer)') IS NOT NULL
        EXEC sp_rename
             @objname = N'[dbo].[Instrument_Water content (Karl Fischer)].[Id_Water content (Karl Fischer)]',
             @newname = N'Id_Water content (Karl Fisher)',
             @objtype = 'COLUMN';

    EXEC sp_rename @objname = N'[dbo].[Instrument_Water content (Karl Fischer)]',
                   @newname = N'Instrument_Water content (Karl Fisher)',
                   @objtype = 'OBJECT';

    SET @sql = N'
        UPDATE [dbo].[Instrument_Water content (Karl Fisher)]
        SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @f, @r),
            [ItemName]   = REPLACE([ItemName]   COLLATE Latin1_General_BIN2, @f, @r),
            [ReportName] = REPLACE([ReportName] COLLATE Latin1_General_BIN2, @f, @r);';
    EXEC sp_executesql @sql, N'@f NVARCHAR(50), @r NVARCHAR(50)', @f = @Find, @r = @Repl;

    UPDATE [dbo].[Request]
    SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @Find, @Repl),
        [ItemName]   = REPLACE([ItemName]   COLLATE Latin1_General_BIN2, @Find, @Repl),
        [ReportName] = REPLACE([ReportName] COLLATE Latin1_General_BIN2, @Find, @Repl)
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%'
       OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%'
       OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%';

    UPDATE [dbo].[MasterPattern]
    SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @Find, @Repl),
        [ItemName]   = REPLACE([ItemName]   COLLATE Latin1_General_BIN2, @Find, @Repl),
        [ReportName] = REPLACE([ReportName] COLLATE Latin1_General_BIN2, @Find, @Repl)
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%'
       OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%'
       OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%';

    UPDATE [dbo].[MasterInstrument]
    SET [Instrument] = REPLACE([Instrument] COLLATE Latin1_General_BIN2, @Find, @Repl)
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%';

    UPDATE [dbo].[MasterItemName]
    SET [ItemName] = REPLACE([ItemName] COLLATE Latin1_General_BIN2, @Find, @Repl)
    WHERE [ItemName] COLLATE Latin1_General_BIN2 LIKE N'%' + @Find + N'%';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
-- IF @@TRANCOUNT > 0 COMMIT TRANSACTION;
GO
*/
