/*
  P34 (Insoluble pentane): เพิ่มคอลัมน์ [W3_1] / [W3_2]

  หน้าจอ P34 เปลี่ยนจาก "Sample used (g)" มาเป็น W3 (g) ที่ย้ายไปอยู่ก่อน
  Calculate (%) และเปลี่ยนสูตรเป็น (W3-W1)/(W2-W1)*100
  ฝั่ง backend (QOMAIN.js) รองรับ W3_1/W3_2 อยู่แล้ว โดยจะอ่าน/เขียนให้
  เฉพาะตารางที่ "มีคอลัมน์นี้จริง" เท่านั้น จึงต้อง ALTER TABLE เพิ่มคอลัมน์
  ให้ตารางเครื่องมือของ P34 ก่อน มิฉะนั้นค่าที่กรอกจะไม่ถูกบันทึก

  ชนิดข้อมูลของ W3_1/W3_2 จะถูกคัดลอกจากคอลัมน์ [W1_1] ของตารางเดียวกัน
  เพื่อให้เก็บค่าเหมือนกับ W1/W2

  รันซ้ำได้ ทุก ALTER มีการเช็คก่อนว่ามีคอลัมน์อยู่แล้วหรือยัง
  รันกับฐานข้อมูล QO
*/

USE [QO];
GO

DECLARE @table SYSNAME = N'Instrument_Insoluble pentane';
DECLARE @sql NVARCHAR(MAX) = N'';

IF NOT EXISTS (
  SELECT 1
  FROM [QO].sys.tables t
  INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = N'dbo' AND t.name = @table
)
BEGIN
  PRINT N'ไม่พบตาราง [QO].[dbo].' + QUOTENAME(@table) + N' - ตรวจชื่อ Instrument ของหน้า P34 อีกครั้ง';
  RETURN;
END

-- คัดลอกชนิดข้อมูลมาจาก [W1_1] ของตารางเดียวกัน
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
WHERE s.name = N'dbo' AND t.name = @table AND c.name = N'W1_1';

-- ถ้าไม่มี W1_1 ให้ใช้ NVARCHAR(50) ซึ่งตรงกับรูปแบบที่ backend เขียนลงไป
SET @typeDef = ISNULL(@typeDef, N'nvarchar(50)');

SELECT @sql = @sql + N'ALTER TABLE [QO].[dbo].' + QUOTENAME(@table)
                   + N' ADD ' + QUOTENAME(v.col) + N' ' + @typeDef + N' NULL;' + CHAR(13) + CHAR(10)
FROM (VALUES (N'W3_1'), (N'W3_2')) AS v(col)
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
  PRINT 'ตาราง P34 มี [W3_1]/[W3_2] อยู่แล้ว';
GO

/*
  ทางเลือก: ถ้าต้องการ "เปลี่ยนชื่อ" คอลัมน์เดิมแทนการเพิ่มใหม่
  (ค่าที่เคยบันทึกไว้ในคอลัมน์ Sample used จะกลายเป็นค่า W3 ซึ่งคนละความหมายกัน
   ให้ใช้เฉพาะตอนที่ข้อมูลเดิมเป็นข้อมูลทดสอบเท่านั้น)

  EXEC sp_rename N'[QO].[dbo].[Instrument_Insoluble pentane].[SampleUse_1]', N'W3_1', 'COLUMN';
  EXEC sp_rename N'[QO].[dbo].[Instrument_Insoluble pentane].[SampleUse_2]', N'W3_2', 'COLUMN';
*/

/*
  หลังจากเพิ่ม W3 แล้ว คอลัมน์ [SampleUse_1] / [SampleUse_2] ของตาราง P34
  จะไม่ถูกใช้อีก (หน้า P31 Water content distillation ยังใช้อยู่ แต่เป็นคนละตาราง)
  ถ้าต้องการลบทิ้งให้สำรองข้อมูลก่อน แล้วค่อยรัน

  ALTER TABLE [QO].[dbo].[Instrument_Insoluble pentane] DROP COLUMN [SampleUse_1];
  ALTER TABLE [QO].[dbo].[Instrument_Insoluble pentane] DROP COLUMN [SampleUse_2];
*/
