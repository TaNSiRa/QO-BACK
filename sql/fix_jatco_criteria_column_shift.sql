-- JATCO (THAILAND) CO., LTD. : ค่า Control Criteria Ranking ใน MasterPattern ถูกกรอกเลื่อนไป 1 คอลัมน์
--
-- ค่าที่ควรเป็น [Remark, Criteria_B-, Criteria_A, Criteria_B+]
-- แต่ตอนนี้เก็บอยู่เป็น    [Criteria_B+, Remark, Criteria_B-, Criteria_A]
--
-- ตัวอย่าง Flash Point (ตามฟอร์มลูกค้า B- = 168-175, A = 176-200, B+ = 201-207)
--   ก่อนแก้ : Remark = '201-207', Criteria_B- = '', Criteria_A = '168-175', Criteria_B+ = '176-200'
--   หลังแก้ : Remark = '',        Criteria_B- = '168-175', Criteria_A = '176-200', Criteria_B+ = '201-207'
--
-- สคริปต์นี้หมุนค่ากลับไปทางซ้าย 1 ช่อง ทั้งหมดอยู่ใน batch เดียวและ COMMIT ให้เอง
-- (ห้ามใส่ BEGIN TRANSACTION ทิ้งไว้โดยไม่ COMMIT เพราะจะล็อกตาราง MasterPattern
--  ทำให้ทุกหน้าที่อ่าน master ค้างจนหมดเวลา)
--
-- มีตัวกันรันซ้ำ: ถ้าข้อมูลถูกต้องอยู่แล้วจะข้ามไปเฉยๆ ไม่หมุนซ้ำ

SET XACT_ABORT ON;
SET NOCOUNT ON;

BEGIN TRANSACTION;

IF EXISTS (
  SELECT 1
  FROM [QO].[dbo].[MasterPattern]
  WHERE [CustFull] = N'JATCO (THAILAND) CO., LTD.'
    AND CONVERT(NVARCHAR(50), [SampleNo]) = N'1'
    AND CONVERT(NVARCHAR(50), [ItemNo]) = N'1'
    AND LTRIM(RTRIM(ISNULL([Criteria_A], N''))) = N'168-175'
)
BEGIN
  UPDATE [QO].[dbo].[MasterPattern]
  SET [Remark]      = [Criteria_B-],
      [Criteria_B-] = [Criteria_A],
      [Criteria_A]  = [Criteria_B+],
      [Criteria_B+] = [Remark]
  WHERE [CustFull] = N'JATCO (THAILAND) CO., LTD.';

  PRINT CONCAT(N'rotated ', @@ROWCOUNT, N' row(s)');
END
ELSE
BEGIN
  PRINT N'skipped: ข้อมูลอยู่ถูกช่องแล้ว (หรือเคยรันสคริปต์นี้ไปแล้ว)';
END

COMMIT TRANSACTION;

-- ตรวจผล: Flash Point ต้องได้ B- = 168-175, A = 176-200, B+ = 201-207
SELECT [SampleNo], [ItemNo], [ReportName], [Criteria_B-], [Criteria_A], [Criteria_B+], [Remark]
FROM [QO].[dbo].[MasterPattern]
WHERE [CustFull] = N'JATCO (THAILAND) CO., LTD.'
ORDER BY [SampleNo], [ItemNo];
