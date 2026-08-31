/* ============================================================================
   ตรวจข้อมูลก่อนรัน rename_karl_fisher_to_fischer.sql STEP 2

   read-only ทั้งไฟล์ ไม่มี UPDATE / DDL เลย กด F5 ได้ทั้งไฟล์
   (เลือกฐานข้อมูลเป็น QO ที่ dropdown ก่อน)

   ที่ต้องตรวจเพิ่มเพราะ STEP 1 ในไฟล์หลัก list DISTINCT ไว้ไม่ครบ
   (ขาด MasterPattern.Instrument/ItemName, MasterInstrument, MasterItemName
    และตาราง Instrument_*) และเพราะจำนวนแถวไม่เท่ากันข้ามคอลัมน์
        Request        Instrument 332 / ItemName 305 / ReportName 327
        MasterPattern  Instrument 134 / ItemName 125 / ReportName 128

   จุดชี้ขาดคือตาราง ค. และ จ.
     ว่าง      -> เคลียร์ รัน STEP 2 ได้เลย
     ไม่ว่าง   -> มีแถวที่ Instrument ไม่ใช่ Karl Fisher แต่ ItemName/ReportName
                  เป็น (เคสแบบ DOWA) ถ้าปล่อยไว้ REPLACE จะไปเปลี่ยนชื่อ
                  บนรายการที่ไม่ใช่ Karl Fisher ด้วย

   หมายเหตุ : คอลัมน์พวกนี้เป็น NVARCHAR(MAX) GROUP BY ตรง ๆ ไม่ได้
              จึง CONVERT เป็น NVARCHAR(4000) ก่อนทุกที่
   ============================================================================ */

USE [QO];
GO


/* ---------------------------------------------------------------------------
   ก. ค่าทุกค่าที่ยังมีคำว่า "Karl Fisher" ครบทุกตาราง/คอลัมน์ที่ STEP 2 จะแตะ
      ดูว่า NewValue ถูกต้องทุกบรรทัด และไม่มีค่าแปลกปลอมหลงมา
   --------------------------------------------------------------------------- */
SELECT N'Request.Instrument' AS Col,
       CONVERT(NVARCHAR(4000), [Instrument]) AS OldValue,
       REPLACE(CONVERT(NVARCHAR(4000), [Instrument]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer') AS NewValue,
       COUNT(*) AS RowCnt
FROM   [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument])

UNION ALL
SELECT N'Request.ItemName',
       CONVERT(NVARCHAR(4000), [ItemName]),
       REPLACE(CONVERT(NVARCHAR(4000), [ItemName]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[Request]
WHERE  [ItemName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ItemName])

UNION ALL
SELECT N'Request.ReportName',
       CONVERT(NVARCHAR(4000), [ReportName]),
       REPLACE(CONVERT(NVARCHAR(4000), [ReportName]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[Request]
WHERE  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ReportName])

UNION ALL
SELECT N'MasterPattern.Instrument',
       CONVERT(NVARCHAR(4000), [Instrument]),
       REPLACE(CONVERT(NVARCHAR(4000), [Instrument]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument])

UNION ALL
SELECT N'MasterPattern.ItemName',
       CONVERT(NVARCHAR(4000), [ItemName]),
       REPLACE(CONVERT(NVARCHAR(4000), [ItemName]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[MasterPattern]
WHERE  [ItemName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ItemName])

UNION ALL
SELECT N'MasterPattern.ReportName',
       CONVERT(NVARCHAR(4000), [ReportName]),
       REPLACE(CONVERT(NVARCHAR(4000), [ReportName]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[MasterPattern]
WHERE  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ReportName])

UNION ALL
SELECT N'MasterInstrument.Instrument',
       CONVERT(NVARCHAR(4000), [Instrument]),
       REPLACE(CONVERT(NVARCHAR(4000), [Instrument]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[MasterInstrument]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument])

UNION ALL
SELECT N'MasterItemName.ItemName',
       CONVERT(NVARCHAR(4000), [ItemName]),
       REPLACE(CONVERT(NVARCHAR(4000), [ItemName]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[MasterItemName]
WHERE  [ItemName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ItemName])

UNION ALL
SELECT N'Instrument_*.Instrument',
       CONVERT(NVARCHAR(4000), [Instrument]),
       REPLACE(CONVERT(NVARCHAR(4000), [Instrument]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[Instrument_Water content (Karl Fisher)]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument])

UNION ALL
SELECT N'Instrument_*.ItemName',
       CONVERT(NVARCHAR(4000), [ItemName]),
       REPLACE(CONVERT(NVARCHAR(4000), [ItemName]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[Instrument_Water content (Karl Fisher)]
WHERE  [ItemName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ItemName])

UNION ALL
SELECT N'Instrument_*.ReportName',
       CONVERT(NVARCHAR(4000), [ReportName]),
       REPLACE(CONVERT(NVARCHAR(4000), [ReportName]) COLLATE Latin1_General_BIN2, N'Karl Fisher', N'Karl Fischer'),
       COUNT(*)
FROM   [dbo].[Instrument_Water content (Karl Fisher)]
WHERE  [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ReportName])

ORDER BY Col, OldValue;
GO


/* ---------------------------------------------------------------------------
   ข. Request : Instrument เป็น Karl Fisher แต่ ItemName ไม่ใช่
      อธิบายส่วนต่าง 332 - 305 = 27 แถว
      ถ้าเป็นชื่อรายการที่คนแก้เองผ่านหน้าจอ = ปกติ ไม่ต้องทำอะไร
   --------------------------------------------------------------------------- */
SELECT CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS ReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE     N'%Karl Fisher%'
  AND  [ItemName]   COLLATE Latin1_General_BIN2 NOT LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ItemName]), CONVERT(NVARCHAR(4000), [ReportName])
ORDER BY RowCnt DESC;
GO


/* ---------------------------------------------------------------------------
   ค. *** ตารางชี้ขาด ***
      Request : Instrument ไม่ใช่ Karl Fisher แต่ ItemName / ReportName เป็น
      (เคสแบบ DOWA : Instrument = Distillation แต่ ReportName = Karl Fisher)

      ว่าง    -> เคลียร์
      ไม่ว่าง -> REPLACE จะไปเปลี่ยนชื่อบนรายการที่ไม่ใช่ Karl Fisher ด้วย
                 ต้องตัดสินใจก่อนว่าจะแก้ต้นทางให้ถูกก่อน หรือยอมให้เปลี่ยน
   --------------------------------------------------------------------------- */
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
         CONVERT(NVARCHAR(4000), [ReportName])
ORDER BY RowCnt DESC;
GO


/* ---------------------------------------------------------------------------
   ง. MasterPattern : เหมือน ข. — อธิบายส่วนต่าง 134 - 125 = 9 แถว
   --------------------------------------------------------------------------- */
SELECT CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS ReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE     N'%Karl Fisher%'
  AND  [ItemName]   COLLATE Latin1_General_BIN2 NOT LIKE N'%Karl Fisher%'
GROUP BY CONVERT(NVARCHAR(4000), [ItemName]), CONVERT(NVARCHAR(4000), [ReportName])
ORDER BY RowCnt DESC;
GO


/* ---------------------------------------------------------------------------
   จ. *** ตารางชี้ขาด ***
      MasterPattern : Instrument ไม่ใช่ Karl Fisher แต่ ItemName / ReportName เป็น
      นี่คือที่ที่เคส DOWA อยู่ (ตอนแก้ข้อ 2 ควรหายไปแล้ว)
   --------------------------------------------------------------------------- */
SELECT CONVERT(NVARCHAR(4000), [Instrument]) AS Instrument,
       CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS ReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 NOT LIKE N'%Karl Fisher%'
  AND ([ItemName]   COLLATE Latin1_General_BIN2 LIKE     N'%Karl Fisher%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE     N'%Karl Fisher%')
GROUP BY CONVERT(NVARCHAR(4000), [Instrument]),
         CONVERT(NVARCHAR(4000), [ItemName]),
         CONVERT(NVARCHAR(4000), [ReportName])
ORDER BY RowCnt DESC;
GO


/* ---------------------------------------------------------------------------
   ฉ. เผื่อไว้ : มีค่าที่สะกด "Karl Fischer" อยู่แล้วหรือยัง
      ถ้ามี แปลว่าข้อมูลปนสองสะกดอยู่ก่อนแล้ว — REPLACE ไม่แตะของเดิม
      (idempotent เพราะ 'Karl Fischer' ไม่มี 'Karl Fisher' เป็น substring)
      แต่ควรรู้ไว้ว่ามีกี่แถว
   --------------------------------------------------------------------------- */
SELECT N'Request'        AS TableName, COUNT(*) AS AlreadyFischerRows FROM [dbo].[Request]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
    OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
UNION ALL
SELECT N'MasterPattern', COUNT(*) FROM [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
    OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
UNION ALL
SELECT N'Instrument_*',  COUNT(*) FROM [dbo].[Instrument_Water content (Karl Fisher)]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
    OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%'
    OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N'%Karl Fischer%';
GO


/* ---------------------------------------------------------------------------
   ช. คำว่า "Karl Fisher" ไปโผล่ในตาราง Instrument_* ตัวไหนบ้าง

   ไฟล์ rename_karl_fisher_to_fischer.sql STEP 2 แตะแค่ตาราง
   [Instrument_Water content (Karl Fisher)] ตัวเดียว
   ถ้าตารางอื่น (โดยเฉพาะ Distillation) มีคำนี้ใน ReportName ด้วย
   แล้ว Request ถูกเปลี่ยนฝ่ายเดียว = หลุด sync กับ key 6 คอลัมน์ของ listItem
   --------------------------------------------------------------------------- */
DECLARE @tables TABLE (name SYSNAME);
INSERT INTO @tables (name) VALUES
    (N'Instrument_Acid Number (Auto-titration)'),
    (N'Instrument_Cooling curve measurement'),
    (N'Instrument_Flash Point'),
    (N'Instrument_Insoluble pentane'),
    (N'Instrument_Kinematic viscosity'),
    (N'Instrument_Micro Carbon Residue Tester'),
    (N'Instrument_Water content (Distillation)'),
    (N'Instrument_Water content (Karl Fisher)');

DECLARE @tb SYSNAME, @sql NVARCHAR(MAX);
DECLARE @out TABLE (
    InstrTable  SYSNAME,
    Instrument  NVARCHAR(4000),
    ItemName    NVARCHAR(4000),
    ReportName  NVARCHAR(4000),
    RowCnt      INT
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
            WHERE [Instrument] COLLATE Latin1_General_BIN2 LIKE N''%Karl Fisher%''
               OR [ItemName]   COLLATE Latin1_General_BIN2 LIKE N''%Karl Fisher%''
               OR [ReportName] COLLATE Latin1_General_BIN2 LIKE N''%Karl Fisher%''
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
   ซ. ค่า ReportName ที่ถูกต้องของรายการ Distillation คืออะไร
      ดูจาก MasterPattern ที่คุณแก้ไปแล้ว เพื่อใช้เป็นค่าเป้าหมาย
      ตอนแก้ 13 แถวที่ค้างใน Request
   --------------------------------------------------------------------------- */
SELECT CONVERT(NVARCHAR(4000), [Instrument]) AS Instrument,
       CONVERT(NVARCHAR(4000), [ItemName])   AS ItemName,
       CONVERT(NVARCHAR(4000), [ReportName]) AS ReportName,
       COUNT(*) AS RowCnt
FROM   [dbo].[MasterPattern]
WHERE  [Instrument] COLLATE Latin1_General_BIN2 LIKE N'%Distillation%'
GROUP BY CONVERT(NVARCHAR(4000), [Instrument]),
         CONVERT(NVARCHAR(4000), [ItemName]),
         CONVERT(NVARCHAR(4000), [ReportName])
ORDER BY RowCnt DESC;
GO
