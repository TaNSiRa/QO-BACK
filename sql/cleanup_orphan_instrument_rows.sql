/* ============================================================================
   ล้าง "แถวค้าง" ในตาราง Instrument_* ที่หลงเหลือจากการถอย status
   กลับเป็น RECEIVE SAMPLE (ถอยเฉพาะตาราง Request แต่ไม่ได้ลบแถวใน Instrument_*)

   นิยามแถวค้าง : แถวใน Instrument_* ที่ key 6 คอลัมน์
       ReqNo, SampleCode, Instrument, ItemNo, ItemName, ReportName
   ตรงกับแถวใน Request ที่ ItemStatus = 'RECEIVE SAMPLE'

   key ชุดนี้คือชุดเดียวกับ duplicateCheckColumns ที่ /QO/listItem ใช้ใน
   NOT EXISTS -> ถ้ามีแถวค้าง insert จะได้ 0 แถว แล้ว RAISERROR
   'Instrument list item insert skipped for Id: ...'
   (QO-BACK/flow/Page1/QOMAIN.js บรรทัด ~1650 และ ~1754)

   วิธีใช้ : รัน STEP 1 ดูก่อน -> ถูกต้องแล้วค่อยรัน STEP 2
   ขอบเขต  : แก้ค่า @ReqNo ในแต่ละ STEP (ต้องแก้ทั้งสองที่ให้ตรงกัน)
             NULL = ทุกใบ request

   ---------------------------------------------------------------------------
   ประวัติการรัน
   2026-08-20 : รันด้วย @ReqNo = NULL (ทุกใบ) ลบไป 2,086 แถว จาก 45 ใบ request
                ทุกแถวเป็น ItemStatus = 'LIST ITEM' ที่ยังไม่มีผลวิเคราะห์
                สำรองแถวที่ลบไว้ที่ [dbo].[bak_20260820_Instrument_*] แล้ว
                เหลือแถวที่ไม่ใช่แถวค้าง 4 แถว (QUE-26-0058 / cooling curve)
                ดู STEP 3 ถ้าต้องการ restore
   ============================================================================ */

USE [QO];
GO

/* ---------------------------------------------------------------------------
   STEP 1 : ดูแถวที่จะถูกลบ (read-only)
   --------------------------------------------------------------------------- */
DECLARE @ReqNo NVARCHAR(100) = N'QUE-26-0020';   -- << NULL = ทุกใบ

/* คอลัมน์ optional ของแต่ละตารางไม่เหมือนกัน และชนิดข้อมูลบางคอลัมน์
   (เช่น ItemNo) ก็ต่างกันระหว่างตาราง จึง CONVERT เป็น NVARCHAR ให้หมด
   ก่อน UNION ALL */
;WITH instr AS (
    SELECT N'Instrument_Acid Number (Auto-titration)' AS InstrTable, CONVERT(NVARCHAR(4000), t.[Id]) AS [Id], CONVERT(NVARCHAR(4000), t.[ReqNo]) AS [ReqNo], CONVERT(NVARCHAR(4000), t.[SampleCode]) AS [SampleCode], CONVERT(NVARCHAR(4000), t.[CustShort]) AS [CustShort], CONVERT(NVARCHAR(4000), t.[Instrument]) AS [Instrument], CONVERT(NVARCHAR(4000), t.[ItemNo]) AS [ItemNo], CONVERT(NVARCHAR(4000), t.[ItemName]) AS [ItemName], CONVERT(NVARCHAR(4000), t.[ReportName]) AS [ReportName], CONVERT(NVARCHAR(4000), t.[ItemStatus]) AS [ItemStatus], CONVERT(NVARCHAR(4000), t.[UserListItem]) AS [UserListItem], CONVERT(NVARCHAR(4000), t.[UserAnalysis]) AS [UserAnalysis], CONVERT(NVARCHAR(4000), t.[ResultApprove]) AS [ResultApprove], CONVERT(NVARCHAR(4000), t.[ItemApprover]) AS [ItemApprover]
    FROM [dbo].[Instrument_Acid Number (Auto-titration)] t
    UNION ALL SELECT N'Instrument_Cooling curve measurement', CONVERT(NVARCHAR(4000), t.[Id]), CONVERT(NVARCHAR(4000), t.[ReqNo]), CONVERT(NVARCHAR(4000), t.[SampleCode]), CONVERT(NVARCHAR(4000), t.[CustShort]), CONVERT(NVARCHAR(4000), t.[Instrument]), CONVERT(NVARCHAR(4000), t.[ItemNo]), CONVERT(NVARCHAR(4000), t.[ItemName]), CONVERT(NVARCHAR(4000), t.[ReportName]), CONVERT(NVARCHAR(4000), t.[ItemStatus]), CONVERT(NVARCHAR(4000), t.[UserListItem]), CONVERT(NVARCHAR(4000), t.[UserAnalysis]), CONVERT(NVARCHAR(4000), t.[ResultApprove]), CONVERT(NVARCHAR(4000), t.[ItemApprover])
    FROM [dbo].[Instrument_Cooling curve measurement] t
    UNION ALL SELECT N'Instrument_Flash Point', CONVERT(NVARCHAR(4000), t.[Id]), CONVERT(NVARCHAR(4000), t.[ReqNo]), CONVERT(NVARCHAR(4000), t.[SampleCode]), CONVERT(NVARCHAR(4000), t.[CustShort]), CONVERT(NVARCHAR(4000), t.[Instrument]), CONVERT(NVARCHAR(4000), t.[ItemNo]), CONVERT(NVARCHAR(4000), t.[ItemName]), CONVERT(NVARCHAR(4000), t.[ReportName]), CONVERT(NVARCHAR(4000), t.[ItemStatus]), CONVERT(NVARCHAR(4000), t.[UserListItem]), CONVERT(NVARCHAR(4000), t.[UserAnalysis]), CONVERT(NVARCHAR(4000), t.[ResultApprove]), CONVERT(NVARCHAR(4000), t.[ItemApprover])
    FROM [dbo].[Instrument_Flash Point] t
    UNION ALL SELECT N'Instrument_Insoluble pentane', CONVERT(NVARCHAR(4000), t.[Id]), CONVERT(NVARCHAR(4000), t.[ReqNo]), CONVERT(NVARCHAR(4000), t.[SampleCode]), CONVERT(NVARCHAR(4000), t.[CustShort]), CONVERT(NVARCHAR(4000), t.[Instrument]), CONVERT(NVARCHAR(4000), t.[ItemNo]), CONVERT(NVARCHAR(4000), t.[ItemName]), CONVERT(NVARCHAR(4000), t.[ReportName]), CONVERT(NVARCHAR(4000), t.[ItemStatus]), CONVERT(NVARCHAR(4000), t.[UserListItem]), CONVERT(NVARCHAR(4000), t.[UserAnalysis]), CONVERT(NVARCHAR(4000), t.[ResultApprove]), CONVERT(NVARCHAR(4000), t.[ItemApprover])
    FROM [dbo].[Instrument_Insoluble pentane] t
    UNION ALL SELECT N'Instrument_Kinematic viscosity', CONVERT(NVARCHAR(4000), t.[Id]), CONVERT(NVARCHAR(4000), t.[ReqNo]), CONVERT(NVARCHAR(4000), t.[SampleCode]), CONVERT(NVARCHAR(4000), t.[CustShort]), CONVERT(NVARCHAR(4000), t.[Instrument]), CONVERT(NVARCHAR(4000), t.[ItemNo]), CONVERT(NVARCHAR(4000), t.[ItemName]), CONVERT(NVARCHAR(4000), t.[ReportName]), CONVERT(NVARCHAR(4000), t.[ItemStatus]), CONVERT(NVARCHAR(4000), t.[UserListItem]), CONVERT(NVARCHAR(4000), t.[UserAnalysis]), CONVERT(NVARCHAR(4000), t.[ResultApprove]), CONVERT(NVARCHAR(4000), t.[ItemApprover])
    FROM [dbo].[Instrument_Kinematic viscosity] t
    UNION ALL SELECT N'Instrument_Micro Carbon Residue Tester', CONVERT(NVARCHAR(4000), t.[Id]), CONVERT(NVARCHAR(4000), t.[ReqNo]), CONVERT(NVARCHAR(4000), t.[SampleCode]), CONVERT(NVARCHAR(4000), t.[CustShort]), CONVERT(NVARCHAR(4000), t.[Instrument]), CONVERT(NVARCHAR(4000), t.[ItemNo]), CONVERT(NVARCHAR(4000), t.[ItemName]), CONVERT(NVARCHAR(4000), t.[ReportName]), CONVERT(NVARCHAR(4000), t.[ItemStatus]), CONVERT(NVARCHAR(4000), t.[UserListItem]), CONVERT(NVARCHAR(4000), t.[UserAnalysis]), CONVERT(NVARCHAR(4000), t.[ResultApprove]), CONVERT(NVARCHAR(4000), t.[ItemApprover])
    FROM [dbo].[Instrument_Micro Carbon Residue Tester] t
    UNION ALL SELECT N'Instrument_Water content (Distillation)', CONVERT(NVARCHAR(4000), t.[Id]), CONVERT(NVARCHAR(4000), t.[ReqNo]), CONVERT(NVARCHAR(4000), t.[SampleCode]), CONVERT(NVARCHAR(4000), t.[CustShort]), CONVERT(NVARCHAR(4000), t.[Instrument]), CONVERT(NVARCHAR(4000), t.[ItemNo]), CONVERT(NVARCHAR(4000), t.[ItemName]), CONVERT(NVARCHAR(4000), t.[ReportName]), CONVERT(NVARCHAR(4000), t.[ItemStatus]), CONVERT(NVARCHAR(4000), t.[UserListItem]), CONVERT(NVARCHAR(4000), t.[UserAnalysis]), CONVERT(NVARCHAR(4000), t.[ResultApprove]), CONVERT(NVARCHAR(4000), t.[ItemApprover])
    FROM [dbo].[Instrument_Water content (Distillation)] t
    UNION ALL SELECT N'Instrument_Water content (Karl Fischer)', CONVERT(NVARCHAR(4000), t.[Id]), CONVERT(NVARCHAR(4000), t.[ReqNo]), CONVERT(NVARCHAR(4000), t.[SampleCode]), CONVERT(NVARCHAR(4000), t.[CustShort]), CONVERT(NVARCHAR(4000), t.[Instrument]), CONVERT(NVARCHAR(4000), t.[ItemNo]), CONVERT(NVARCHAR(4000), t.[ItemName]), CONVERT(NVARCHAR(4000), t.[ReportName]), CONVERT(NVARCHAR(4000), t.[ItemStatus]), CONVERT(NVARCHAR(4000), t.[UserListItem]), CONVERT(NVARCHAR(4000), t.[UserAnalysis]), CONVERT(NVARCHAR(4000), t.[ResultApprove]), CONVERT(NVARCHAR(4000), t.[ItemApprover])
    FROM [dbo].[Instrument_Water content (Karl Fischer)] t
)
SELECT o.InstrTable, o.[Id], o.[ReqNo], o.[SampleCode], o.[CustShort],
       o.[Instrument], o.[ItemNo], o.[ItemName], o.[ReportName],
       o.[ItemStatus], o.[UserListItem], o.[UserAnalysis], o.[ResultApprove], o.[ItemApprover]
FROM instr o
WHERE (@ReqNo IS NULL OR o.[ReqNo] = @ReqNo)
  AND EXISTS (
        SELECT 1 FROM [dbo].[Request] s
        WHERE ISNULL(CONVERT(NVARCHAR(4000), o.[ReqNo]),      N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ReqNo]),      N'')
          AND ISNULL(CONVERT(NVARCHAR(4000), o.[SampleCode]), N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[SampleCode]), N'')
          AND ISNULL(CONVERT(NVARCHAR(4000), o.[Instrument]), N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[Instrument]), N'')
          AND ISNULL(CONVERT(NVARCHAR(4000), o.[ItemNo]),     N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ItemNo]),     N'')
          AND ISNULL(CONVERT(NVARCHAR(4000), o.[ItemName]),   N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ItemName]),   N'')
          AND ISNULL(CONVERT(NVARCHAR(4000), o.[ReportName]), N'') = ISNULL(CONVERT(NVARCHAR(4000), s.[ReportName]), N'')
          AND UPPER(LTRIM(RTRIM(ISNULL(s.[ItemStatus], N'')))) = N'RECEIVE SAMPLE'
      )
ORDER BY o.[ReqNo], o.[SampleCode], o.InstrTable, o.[ItemNo];
GO


/* ---------------------------------------------------------------------------
   STEP 2 : ลบจริง
     - guard : ลบเฉพาะแถวที่ยังไม่มี UserAnalysis / ResultApprove / ItemApprover
               (แถวที่ลงผลวิเคราะห์หรือ approve แล้วจะไม่ถูกแตะ)
     - อยู่ใน transaction และตั้งต้นเป็น ROLLBACK
       ให้ดูจำนวนใน tab Messages ก่อน แล้วค่อยเปลี่ยนบรรทัดท้ายเป็น COMMIT
   --------------------------------------------------------------------------- */
DECLARE @ReqNo NVARCHAR(100) = N'QUE-26-0020';   -- << ต้องตรงกับ STEP 1

DECLARE @tables TABLE (name SYSNAME);
INSERT INTO @tables (name) VALUES
    (N'Instrument_Acid Number (Auto-titration)'),
    (N'Instrument_Cooling curve measurement'),
    (N'Instrument_Flash Point'),
    (N'Instrument_Insoluble pentane'),
    (N'Instrument_Kinematic viscosity'),
    (N'Instrument_Micro Carbon Residue Tester'),
    (N'Instrument_Water content (Distillation)'),
    (N'Instrument_Water content (Karl Fischer)');

DECLARE @tb SYSNAME, @sql NVARCHAR(MAX), @cnt INT, @Total INT = 0;

BEGIN TRANSACTION;
BEGIN TRY

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @tables;
    OPEN cur;
    FETCH NEXT FROM cur INTO @tb;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'
            DELETE t
            FROM [dbo].' + QUOTENAME(@tb) + N' t
            WHERE (@p_ReqNo IS NULL OR t.[ReqNo] = @p_ReqNo)
              AND EXISTS (
                    SELECT 1 FROM [dbo].[Request] s
                    WHERE ISNULL(CONVERT(NVARCHAR(4000), t.[ReqNo]),      N'''') = ISNULL(CONVERT(NVARCHAR(4000), s.[ReqNo]),      N'''')
                      AND ISNULL(CONVERT(NVARCHAR(4000), t.[SampleCode]), N'''') = ISNULL(CONVERT(NVARCHAR(4000), s.[SampleCode]), N'''')
                      AND ISNULL(CONVERT(NVARCHAR(4000), t.[Instrument]), N'''') = ISNULL(CONVERT(NVARCHAR(4000), s.[Instrument]), N'''')
                      AND ISNULL(CONVERT(NVARCHAR(4000), t.[ItemNo]),     N'''') = ISNULL(CONVERT(NVARCHAR(4000), s.[ItemNo]),     N'''')
                      AND ISNULL(CONVERT(NVARCHAR(4000), t.[ItemName]),   N'''') = ISNULL(CONVERT(NVARCHAR(4000), s.[ItemName]),   N'''')
                      AND ISNULL(CONVERT(NVARCHAR(4000), t.[ReportName]), N'''') = ISNULL(CONVERT(NVARCHAR(4000), s.[ReportName]), N'''')
                      AND UPPER(LTRIM(RTRIM(ISNULL(s.[ItemStatus], N'''')))) = N''RECEIVE SAMPLE''
                  )
              AND (t.[UserAnalysis]  IS NULL OR LTRIM(RTRIM(CONVERT(NVARCHAR(4000), t.[UserAnalysis])))  = N'''')
              AND (t.[ResultApprove] IS NULL OR LTRIM(RTRIM(CONVERT(NVARCHAR(4000), t.[ResultApprove]))) = N'''')
              AND (t.[ItemApprover]  IS NULL OR LTRIM(RTRIM(CONVERT(NVARCHAR(4000), t.[ItemApprover])))  = N'''');';

        EXEC sp_executesql @sql, N'@p_ReqNo NVARCHAR(100)', @p_ReqNo = @ReqNo;
        SET @cnt = @@ROWCOUNT;
        SET @Total = @Total + @cnt;
        PRINT @tb + N'  ->  deleted ' + CAST(@cnt AS NVARCHAR(20));

        FETCH NEXT FROM cur INTO @tb;
    END

    CLOSE cur;
    DEALLOCATE cur;

    PRINT N'------------------------------';
    PRINT N'TOTAL deleted = ' + CAST(@Total AS NVARCHAR(20));

    ROLLBACK TRANSACTION;   -- << ดูตัวเลขแล้วเปลี่ยนบรรทัดนี้เป็น  COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF CURSOR_STATUS('local', 'cur') >= 0
    BEGIN
        CLOSE cur;
        DEALLOCATE cur;
    END
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO


/* ---------------------------------------------------------------------------
   STEP 3 : restore จากตารางสำรอง (ใช้เมื่อลบผิด)
     ตารางสำรองของรอบ 2026-08-20 : [dbo].[bak_20260820_Instrument_*]
     คอลัมน์ Id ในตารางจริงเป็น identity จึงต้องเปิด IDENTITY_INSERT
     เปลี่ยนชื่อตารางในตัวอย่างนี้ให้ตรงกับตารางที่ต้องการ restore
   --------------------------------------------------------------------------- */
/*
SET IDENTITY_INSERT [dbo].[Instrument_Flash Point] ON;

INSERT INTO [dbo].[Instrument_Flash Point]
    ([Id],[ReqNo],[SampleCode],[ItemStatus],[CustFull],[CustShort],[SampleNo],[SampleName],
     [Furnance],[Instrument],[ItemNo],[ItemName],[ReportName],[AnalysisDue],
     [UserListItem],[ListItemDate],[UserAnalysis],[AnalysisDate],[Picture],
     [ResultApprove],[ItemApprover],[ItemApproveDate])
SELECT
     [Id],[ReqNo],[SampleCode],[ItemStatus],[CustFull],[CustShort],[SampleNo],[SampleName],
     [Furnance],[Instrument],[ItemNo],[ItemName],[ReportName],[AnalysisDue],
     [UserListItem],[ListItemDate],[UserAnalysis],[AnalysisDate],[Picture],
     [ResultApprove],[ItemApprover],[ItemApproveDate]
FROM [dbo].[bak_20260820_Instrument_Flash Point];

SET IDENTITY_INSERT [dbo].[Instrument_Flash Point] OFF;
*/

/* ---------------------------------------------------------------------------
   STEP 4 : ลบตารางสำรองทิ้ง เมื่อมั่นใจแล้วว่าไม่ต้องใช้
   --------------------------------------------------------------------------- */
/*
DROP TABLE [dbo].[bak_20260820_Instrument_Acid Number (Auto-titration)];
DROP TABLE [dbo].[bak_20260820_Instrument_Cooling curve measurement];
DROP TABLE [dbo].[bak_20260820_Instrument_Flash Point];
DROP TABLE [dbo].[bak_20260820_Instrument_Insoluble pentane];
DROP TABLE [dbo].[bak_20260820_Instrument_Kinematic viscosity];
DROP TABLE [dbo].[bak_20260820_Instrument_Micro Carbon Residue Tester];
DROP TABLE [dbo].[bak_20260820_Instrument_Water content (Distillation)];
DROP TABLE [dbo].[bak_20260820_Instrument_Water content (Karl Fisher)];
*/
