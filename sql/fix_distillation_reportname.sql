/* ============================================================================
   แก้บั๊กข้อมูล : รายการ Distillation ที่ ReportName ติดคำว่า "Karl Fisher"

   ต้องรันไฟล์นี้ให้จบก่อน แล้วค่อยไปรัน rename_karl_fisher_to_fischer.sql

   ปัญหา
     พบจาก check_karl_fisher_data.sql ตาราง ค. — 13 แถวใน [Request]
         Instrument = Water content (Distillation)
         ItemName   = Water content by Distillation
         ReportName = Water content by Karl Fisher (%)      << ผิด
     MasterPattern แก้ไปแล้ว แต่แถวเก่าใน Request ยังค้าง

   ทำไมต้องแก้ก่อน
     แถวพวกนี้ Instrument เป็น Distillation แถวคู่ของมันจึงอยู่ในตาราง
     [Instrument_Water content (Distillation)] ซึ่ง rename_karl_fisher_to_fischer.sql
     ไม่ได้แตะ (แตะแค่ตาราง Karl Fisher)
     ถ้าปล่อยไว้ REPLACE จะเปลี่ยน Request ฝ่ายเดียวเป็น "Karl Fischer (%)"
     ทำให้ ReportName สองฝั่งไม่ตรงกัน -> หลุดจาก key 6 คอลัมน์ที่
     /QO/listItem ใช้เช็คซ้ำ (QOMAIN.js ~1651) -> เกิดแถวซ้ำ
     (เคสเดียวกับที่ต้องรัน cleanup_orphan_instrument_rows.sql เมื่อ 2026-08-20)

   วิธีแก้
     ตั้ง ReportName เป็นค่าเดียวตายตัว   'Water content by Distillation (ppm)'
     ไม่ได้รักษาส่วนท้ายเดิม -> แถวที่เคยเป็น (%) จะกลายเป็น (ppm) ด้วย
     ให้ตรงกับอีก 18 แถวที่ถูกต้องอยู่แล้ว
     จำกัดขอบเขตเฉพาะแถวที่ Instrument เป็น Distillation เท่านั้น
     แถว Karl Fisher จริง ๆ ไม่ถูกแตะ

   วิธีใช้
     STEP 0 : ดูว่าจะเปลี่ยนอะไรบ้าง (read-only)
     STEP 1 : รันจริง — ตั้งต้นเป็น ROLLBACK สลับเป็น COMMIT เองเมื่อตัวเลขถูก
     STEP 2 : ตรวจผล — ต้องได้ 0 ทุกช่อง แล้วจึงไปรัน rename_karl_fisher_to_fischer.sql

   ก่อนรัน : หยุด service QO-BACK และ backup [Request] +
             [Instrument_Water content (Distillation)]

   ---------------------------------------------------------------------------
   ประวัติการรัน
   2026-08-31 : COMMIT แล้ว
                Request 13 แถว / Instrument_Water content (Distillation) 13 แถว
                MasterPattern 0 แถว (แก้ด้วยมือไปก่อนหน้าแล้ว)
                ReportName 'Water content by Karl Fisher (%)'
                        -> 'Water content by Distillation (ppm)'
   ============================================================================ */

USE [QO];
GO


/* ---------------------------------------------------------------------------
   STEP 0 : ดูว่าจะเปลี่ยนอะไรบ้าง (read-only)
   --------------------------------------------------------------------------- */

-- 0.1 Request
SELECT N'Request' AS TableName,
       CONVERT(NVARCHAR(4000), [Instrument]) AS Instrument,
       CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS OldReportName,
       N'Water content by Distillation (ppm)' AS NewReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
  AND  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument]),
         CONVERT(NVARCHAR(4000), [ItemName]),
         CONVERT(NVARCHAR(4000), [ReportName]);

-- 0.2 ตาราง Instrument_* ของ Distillation
SELECT N'Instrument_Water content (Distillation)' AS TableName,
       CONVERT(NVARCHAR(4000), [Instrument]) AS Instrument,
       CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS OldReportName,
       N'Water content by Distillation (ppm)' AS NewReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[Instrument_Water content (Distillation)]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
  AND  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument]),
         CONVERT(NVARCHAR(4000), [ItemName]),
         CONVERT(NVARCHAR(4000), [ReportName]);

-- 0.3 MasterPattern (ควรว่าง เพราะแก้ไปแล้ว — ถ้าไม่ว่างจะถูกแก้ด้วยใน STEP 1)
SELECT N'MasterPattern' AS TableName,
       CONVERT(NVARCHAR(4000), [Instrument]) AS Instrument,
       CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS OldReportName,
       N'Water content by Distillation (ppm)' AS NewReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
  AND  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument]),
         CONVERT(NVARCHAR(4000), [ItemName]),
         CONVERT(NVARCHAR(4000), [ReportName]);

-- 0.4 ค่า ReportName ทั้งหมดของรายการ Distillation ตอนนี้
--     หลังรัน STEP 1 ควรเหลือค่าเดียวคือ 'Water content by Distillation (ppm)'
SELECT CONVERT(NVARCHAR(4000), [ReportName]) AS ReportName, COUNT(*) AS RowCnt
FROM   [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
GROUP BY CONVERT(NVARCHAR(4000), [ReportName])
ORDER BY RowCnt DESC;

-- 0.5 กันพลาด : ตาราง Instrument_* ตัวอื่นมีเคสแบบเดียวกันไหม
--     (แถวที่ Instrument ไม่ใช่ Karl Fisher แต่ ItemName/ReportName เป็น)
--     ถ้ามีแถวโผล่มานอกเหนือจาก Distillation ต้องบอกก่อน อย่าเพิ่งรัน STEP 1
DECLARE @tables TABLE (name SYSNAME);
INSERT INTO @tables (name) VALUES
    (N'Instrument_Acid Number (Auto-titration)'),
    (N'Instrument_Cooling curve measurement'),
    (N'Instrument_Flash Point'),
    (N'Instrument_Insoluble pentane'),
    (N'Instrument_Kinematic viscosity'),
    (N'Instrument_Micro Carbon Residue Tester'),
    (N'Instrument_Water content (Distillation)');

DECLARE @tb SYSNAME, @sql NVARCHAR(MAX);
DECLARE @out TABLE (
    InstrTable SYSNAME,
    Instrument NVARCHAR(4000),
    ItemName   NVARCHAR(4000),
    ReportName NVARCHAR(4000),
    RowCnt     INT
);

DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @tables;
OPEN cur;
FETCH NEXT FROM cur INTO @tb;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF OBJECT_ID(N'[dbo].' + QUOTENAME(@tb), N'U') IS NOT NULL
    BEGIN
        SET @sql = N'
            SELECT @p_tb,
                   CONVERT(NVARCHAR(4000), [Instrument]),
                   CONVERT(NVARCHAR(4000), [ItemName]),
                   CONVERT(NVARCHAR(4000), [ReportName]),
                   COUNT(*)
            FROM [dbo].' + QUOTENAME(@tb) + N'
            WHERE [Instrument] COLLATE Latin1_General_BIN2 NOT LIKE N''%Karl Fisher%''
              AND ([ItemName]   COLLATE Latin1_General_BIN2 LIKE N''%Karl Fisher%''
                OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N''%Karl Fisher%'')
            GROUP BY CONVERT(NVARCHAR(4000), [Instrument]),
                     CONVERT(NVARCHAR(4000), [ItemName]),
                     CONVERT(NVARCHAR(4000), [ReportName]);';
        INSERT INTO @out
        EXEC sp_executesql @sql, N'@p_tb SYSNAME', @p_tb = @tb;
    END
    FETCH NEXT FROM cur INTO @tb;
END
CLOSE cur;
DEALLOCATE cur;

SELECT * FROM @out ORDER BY InstrTable, ReportName;
GO


/* ---------------------------------------------------------------------------
   STEP 1 : รันจริง

   แก้ทั้ง 3 ตารางใน transaction เดียว เพื่อไม่ให้ ReportName สองฝั่งหลุดกัน
   ตั้งต้นเป็น ROLLBACK — ดูตัวเลขใน tab Messages ให้ตรงกับ STEP 0 ก่อน
   แล้วค่อยสลับสองบรรทัดสุดท้าย
   --------------------------------------------------------------------------- */

SET XACT_ABORT ON;
SET NOCOUNT ON;

DECLARE @NewReportName NVARCHAR(200) = N'Water content by Distillation (ppm)';

BEGIN TRANSACTION;
BEGIN TRY

    /* ---- 1.1 Request ----------------------------------------------------- */
    UPDATE [dbo].[Request]
    SET [ReportName] = @NewReportName
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
      AND [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%';
    PRINT N'1.1 Request                          : ' + CONVERT(NVARCHAR(20), @@ROWCOUNT) + N' แถว';

    /* ---- 1.2 Instrument_Water content (Distillation) ---------------------- */
    UPDATE [dbo].[Instrument_Water content (Distillation)]
    SET [ReportName] = @NewReportName
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
      AND [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%';
    PRINT N'1.2 Instrument_Water content (Dist.) : ' + CONVERT(NVARCHAR(20), @@ROWCOUNT) + N' แถว';

    /* ---- 1.3 MasterPattern (เผื่อยังมีตกค้าง ปกติควรได้ 0) ---------------- */
    UPDATE [dbo].[MasterPattern]
    SET [ReportName] = @NewReportName
    WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
      AND [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%';
    PRINT N'1.3 MasterPattern                    : ' + CONVERT(NVARCHAR(20), @@ROWCOUNT) + N' แถว';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH

-- << ตัวเลขตรงกับ STEP 0 แล้วค่อยสลับสองบรรทัดนี้
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
-- IF @@TRANCOUNT > 0 COMMIT TRANSACTION;
GO


/* ---------------------------------------------------------------------------
   STEP 2 : ตรวจผลหลัง COMMIT — ต้องได้ 0 ทุกช่อง
            ผ่านแล้วจึงไปรัน rename_karl_fisher_to_fischer.sql ได้
   --------------------------------------------------------------------------- */

-- 2.1 ไม่มีรายการ Distillation ที่ ReportName ยังติด Karl Fisher
SELECT N'Request'                                 AS TableName, COUNT(*) AS BadRows
FROM   [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
  AND  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'Instrument_Water content (Distillation)', COUNT(*)
FROM   [dbo].[Instrument_Water content (Distillation)]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
  AND  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
UNION ALL
SELECT N'MasterPattern',                           COUNT(*)
FROM   [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
  AND  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%';

-- 2.2 ตาราง ค. เดิมจาก check_karl_fisher_data.sql ต้องว่างแล้ว
SELECT CONVERT(NVARCHAR(4000), [Instrument]) AS Instrument,
       CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS ReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 NOT LIKE N'%Karl Fisher%'
  AND ([ItemName]   COLLATE Latin1_General_BIN2 LIKE     N'%Karl Fisher%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE     N'%Karl Fisher%')
GROUP BY CONVERT(NVARCHAR(4000), [Instrument]),
         CONVERT(NVARCHAR(4000), [ItemName]),
         CONVERT(NVARCHAR(4000), [ReportName]);

-- 2.3 ReportName ของรายการ Distillation ควรเหลือค่าเดียว
SELECT CONVERT(NVARCHAR(4000), [ReportName]) AS ReportName, COUNT(*) AS RowCnt
FROM   [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
GROUP BY CONVERT(NVARCHAR(4000), [ReportName])
ORDER BY RowCnt DESC;

-- 2.4 Request กับ Instrument_* ยัง match กันด้วย key 6 คอลัมน์
--     MatchedWithRequest ควรเท่ากับ TotalRows
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
    FROM [dbo].[Instrument_Water content (Distillation)] t
) m;
GO
