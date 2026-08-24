/*
  Adds the [TempSaveDate] column used by the "Temp Save" button on pages P27-P34.

  ปุ่ม Temp Save จะเปลี่ยนสีตามคอลัมน์นี้ (เทาอ่อน = ยังไม่เคยกด, เทาเข้ม = กดแล้ว)
  - กด Temp Save  -> QOMAIN.js เขียนเวลาปัจจุบันลง [TempSaveDate]
  - กด Save จริง  -> [TempSaveDate] ถูกล้างเป็น NULL (แถวถูกบันทึกจบแล้ว)

  ค่าที่เก็บเป็นสตริง ISO เดียวกับที่เขียนลง [AnalysisDate] จึงใช้ NVARCHAR(50).
  Backend ทำงานได้แม้ยังไม่ได้รันสคริปต์นี้ (เช็คว่ามีคอลัมน์ก่อนใช้เสมอ)
  แต่ปุ่มจะเป็นสีเทาอ่อนตลอดจนกว่าจะเพิ่มคอลัมน์

  Safe to run more than once: every ALTER is guarded by a column check.
  Run against the QO database.
*/

USE [QO];
GO

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + N'ALTER TABLE [QO].[dbo].' + QUOTENAME(t.name)
                   + N' ADD [TempSaveDate] NVARCHAR(50) NULL;' + CHAR(13) + CHAR(10)
FROM [QO].sys.tables t
INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = N'dbo'
  AND t.name LIKE N'Instrument[_]%'
  AND NOT EXISTS (
    SELECT 1
    FROM [QO].sys.columns c
    WHERE c.object_id = t.object_id
      AND c.name = N'TempSaveDate'
  );

IF @sql <> N''
BEGIN
  PRINT @sql;
  EXEC sp_executesql @sql;
END
ELSE
  PRINT 'All Instrument_* tables already have [TempSaveDate].';
GO
