/*
  Adds the [Type] column that splits every request into 'Special' or 'Service lab'.

  ค่าที่เก็บมี 2 แบบเท่านั้น
    N'Special'      - งาน Special
    N'Service lab'  - งาน Service lab

  ผู้ใช้เลือก Type ตอน Create Request (ถัดจาก Sampling Date) แล้วค่าจะถูกเขียน
  ลงทุกแถวของ ReqNo นั้น หน้า Request list / Request list detail / สติ๊กเกอร์
  และหน้า Summary (KPI, KPI-ITEM, KPI-ITEM BY CUSTOMER) อ่านค่าจากคอลัมน์นี้

  ข้อมูลเก่าที่สร้างก่อนมีคอลัมน์นี้จะเป็น NULL และถูกข้ามในการคำนวณ Summary
  ทั้งหมด (ตามที่ตกลงไว้ว่าไม่ต้องนำข้อมูลเก่ามาคิด)

  เฉพาะตาราง [Request] เท่านั้นที่ต้องเพิ่มคอลัมน์นี้
  ตาราง Instrument_* ไม่ต้อง เพราะหน้าวิเคราะห์ไม่ได้ใช้ Type และการคำนวณ
  Summary ทุกตัวอ่านจาก [Request] อย่างเดียว

  Safe to run more than once: ALTER ถูกครอบด้วยการเช็คคอลัมน์ไว้แล้ว
  Run against the QO database.
*/

USE [QO];
GO

IF NOT EXISTS (
  SELECT 1
  FROM [QO].sys.tables t
  INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
  INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
  WHERE s.name = N'dbo'
    AND t.name = N'Request'
    AND c.name = N'Type'
)
BEGIN
  ALTER TABLE [QO].[dbo].[Request] ADD [Type] NVARCHAR(20) NULL;
  PRINT 'Added [Type] to [Request].';
END
ELSE
  PRINT '[Request] already has [Type].';
GO
