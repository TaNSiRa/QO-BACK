/*
  P31 (Water content Distillation): เพิ่มคอลัมน์ [Result_pct_1] / [Result_pct_2]

  หน้าจอ P31 เพิ่มคอลัมน์ "Water content (%)" ต่อท้าย "Water content (ppm)"
  โดยคิดจาก ppm / 10000
    [Result_1] / [Result_2]         = Water content (ppm)  (ของเดิม ไม่ย้าย)
    [Result_pct_1] / [Result_pct_2] = Water content (%)    (ของใหม่)

  ฝั่ง backend (QOMAIN.js) รองรับ Result_pct_1 / Result_pct_2 อยู่แล้ว โดยจะ
  อ่าน/เขียนให้เฉพาะตารางที่ "มีคอลัมน์นี้จริง" เท่านั้น จึงต้อง ALTER TABLE
  เพิ่มคอลัมน์ให้ตารางเครื่องมือของ P31 ก่อน มิฉะนั้นค่า % ที่คำนวณได้จะไม่ถูก
  บันทึก (หน้าจอยังคำนวณและแสดงผลได้ตามปกติ แต่ค่าจะหายเมื่อโหลดข้อมูลใหม่)

  ชนิดข้อมูลของ Result_pct_1/Result_pct_2 จะถูกคัดลอกจากคอลัมน์ [Result_1]
  ของตารางเดียวกัน เพื่อให้เก็บค่าเหมือนกับ Result เดิม

  ส่วนท้ายมี STEP 2 (คอมเมนต์ไว้) สำหรับเติมค่า % ย้อนหลังให้แถวเก่า
  ที่มีค่า ppm อยู่แล้ว — เลือกรันได้ตามต้องการ

  รันซ้ำได้ ทุก ALTER มีการเช็คก่อนว่ามีคอลัมน์อยู่แล้วหรือยัง
  รันกับฐานข้อมูล QO
*/

USE [QO];
GO

/* ---------------------------------------------------------------------------
   STEP 1 : เพิ่มคอลัมน์
   --------------------------------------------------------------------------- */

DECLARE @table SYSNAME = N'Instrument_Water content (Distillation)';
DECLARE @sql NVARCHAR(MAX) = N'';

IF NOT EXISTS (
  SELECT 1
  FROM [QO].sys.tables t
  INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = N'dbo' AND t.name = @table
)
BEGIN
  PRINT N'ไม่พบตาราง [QO].[dbo].' + QUOTENAME(@table) + N' - ตรวจชื่อ Instrument ของหน้า P31 อีกครั้ง';
  RETURN;
END

-- คัดลอกชนิดข้อมูลมาจาก [Result_1] ของตารางเดียวกัน
DECLARE @typeDef NVARCHAR(200);

SELECT @typeDef =
  CASE
    WHEN ty.name IN (N'nvarchar', N'nchar', N'varchar', N'char')
      THEN ty.name + N'(' + CASE WHEN c.max_length = -1 THEN N'MAX'
                                 WHEN ty.name IN (N'nvarchar', N'nchar') THEN CAST(c.max_length / 2 AS NVARCHAR(10))
                                 ELSE CAST(c.max_length AS NVARCHAR(10)) END + N')'
    WHEN ty.name IN (N'decimal', N'numeric')
      THEN ty.name + N'(' + CAST(c.precision AS NVARCHAR(10)) + N',' + CAST(c.scale AS NVARCHAR(10)) + N')'
    ELSE ty.name
  END
FROM [QO].sys.tables t
INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
INNER JOIN [QO].sys.types ty ON ty.user_type_id = c.user_type_id
WHERE s.name = N'dbo' AND t.name = @table AND c.name = N'Result_1';

-- ถ้าไม่มี Result_1 ให้ใช้ NVARCHAR(50) ซึ่งตรงกับรูปแบบที่ backend เขียนลงไป
SET @typeDef = ISNULL(@typeDef, N'nvarchar(50)');

SELECT @sql = @sql + N'ALTER TABLE [QO].[dbo].' + QUOTENAME(@table)
                   + N' ADD ' + QUOTENAME(v.col) + N' ' + @typeDef + N' NULL;' + CHAR(13) + CHAR(10)
FROM (VALUES (N'Result_pct_1'), (N'Result_pct_2')) AS v(col)
WHERE NOT EXISTS (
  SELECT 1
  FROM [QO].sys.tables t
  INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
  INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
  WHERE s.name = N'dbo' AND t.name = @table AND c.name = v.col
);

IF @sql <> N''
BEGIN
  PRINT @sql;
  EXEC sp_executesql @sql;
END
ELSE
  PRINT N'ตาราง P31 มี [Result_pct_1]/[Result_pct_2] อยู่แล้ว';
GO


/* ---------------------------------------------------------------------------
   STEP 2 (ทางเลือก) : เติมค่า % ย้อนหลังให้แถวเก่าที่มีค่า ppm อยู่แล้ว

   ค่าที่ต่ำกว่าเกณฑ์ ("<100" / "<200") จะเก็บเป็น "<0.0100" / "<0.0200"
   ให้ตรงกับที่หน้าจอคำนวณ (ทศนิยม 4 ตำแหน่ง)

   ตรวจผลด้วย SELECT ก่อน แล้วค่อยเอาคอมเมนต์ของ UPDATE ออก
   --------------------------------------------------------------------------- */

-- SELECT
--   CONVERT(NVARCHAR(4000), [Result_1]) AS Result_ppm_1,
--   CONVERT(NVARCHAR(4000), [Result_2]) AS Result_ppm_2,
--   CONVERT(NVARCHAR(4000), [Result_pct_1]) AS Result_pct_1,
--   CONVERT(NVARCHAR(4000), [Result_pct_2]) AS Result_pct_2
-- FROM [QO].[dbo].[Instrument_Water content (Distillation)];

-- UPDATE [QO].[dbo].[Instrument_Water content (Distillation)]
-- SET
--   [Result_pct_1] = CASE
--     WHEN NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(100), [Result_1]))), N'') IS NULL THEN NULL
--     WHEN LTRIM(CONVERT(NVARCHAR(100), [Result_1])) LIKE N'<%'
--       THEN N'<' + CONVERT(NVARCHAR(50), CONVERT(DECIMAL(18, 4),
--              TRY_CONVERT(FLOAT, LTRIM(RTRIM(REPLACE(CONVERT(NVARCHAR(100), [Result_1]), N'<', N'')))) / 10000.0))
--     ELSE CONVERT(NVARCHAR(50), CONVERT(DECIMAL(18, 4),
--            TRY_CONVERT(FLOAT, LTRIM(RTRIM(CONVERT(NVARCHAR(100), [Result_1])))) / 10000.0))
--   END,
--   [Result_pct_2] = CASE
--     WHEN NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(100), [Result_2]))), N'') IS NULL THEN NULL
--     WHEN LTRIM(CONVERT(NVARCHAR(100), [Result_2])) LIKE N'<%'
--       THEN N'<' + CONVERT(NVARCHAR(50), CONVERT(DECIMAL(18, 4),
--              TRY_CONVERT(FLOAT, LTRIM(RTRIM(REPLACE(CONVERT(NVARCHAR(100), [Result_2]), N'<', N'')))) / 10000.0))
--     ELSE CONVERT(NVARCHAR(50), CONVERT(DECIMAL(18, 4),
--            TRY_CONVERT(FLOAT, LTRIM(RTRIM(CONVERT(NVARCHAR(100), [Result_2])))) / 10000.0))
--   END;
