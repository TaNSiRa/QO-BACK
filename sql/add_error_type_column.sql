/*
  Adds the [ErrorType] column used by the "Error" dropdown on pages P27-P34.

  The dropdown stores the full text ('Instrument breakdown', 'Sample error',
  'Analysis error'). When an item with an ErrorType is approved, ResultApprove
  is written as the abbreviation (I/B, S/E, A/E) instead of the Result 1/2
  average — that mapping lives in QOMAIN.js (QO_ERROR_ABBREVIATIONS).

  Safe to run more than once: every ALTER is guarded by a column check.
  Run against the QO database.
*/

USE [QO];
GO

-- 1) Every instrument table (Instrument_*) gets the column.
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + N'ALTER TABLE [QO].[dbo].' + QUOTENAME(t.name)
                   + N' ADD [ErrorType] NVARCHAR(50) NULL;' + CHAR(13) + CHAR(10)
FROM [QO].sys.tables t
INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = N'dbo'
  AND t.name LIKE N'Instrument[_]%'
  AND NOT EXISTS (
    SELECT 1
    FROM [QO].sys.columns c
    WHERE c.object_id = t.object_id
      AND c.name = N'ErrorType'
  );

IF @sql <> N''
BEGIN
  PRINT @sql;
  EXEC sp_executesql @sql;
END
ELSE
  PRINT 'All Instrument_* tables already have [ErrorType].';
GO

-- 2) Request keeps a copy so the value survives on the request row after approve.
IF NOT EXISTS (
  SELECT 1
  FROM [QO].sys.tables t
  INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
  INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
  WHERE s.name = N'dbo'
    AND t.name = N'Request'
    AND c.name = N'ErrorType'
)
BEGIN
  ALTER TABLE [QO].[dbo].[Request] ADD [ErrorType] NVARCHAR(50) NULL;
  PRINT 'Added [ErrorType] to [Request].';
END
ELSE
  PRINT '[Request] already has [ErrorType].';
GO
