USE [FlavorMap];
GO

SELECT N'Reviews.IsHidden' AS CheckName,
       CASE WHEN COL_LENGTH('dbo.Reviews', 'IsHidden') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS Result
UNION ALL
SELECT N'Reviews.ModerationReason', CASE WHEN COL_LENGTH('dbo.Reviews', 'ModerationReason') IS NOT NULL THEN N'OK' ELSE N'MISSING' END
UNION ALL
SELECT N'Reviews.ModeratedByUserId', CASE WHEN COL_LENGTH('dbo.Reviews', 'ModeratedByUserId') IS NOT NULL THEN N'OK' ELSE N'MISSING' END
UNION ALL
SELECT N'Reviews.ModeratedAtUtc', CASE WHEN COL_LENGTH('dbo.Reviews', 'ModeratedAtUtc') IS NOT NULL THEN N'OK' ELSE N'MISSING' END
UNION ALL
SELECT N'ReviewReports table', CASE WHEN OBJECT_ID(N'dbo.ReviewReports', N'U') IS NOT NULL THEN N'OK' ELSE N'MISSING' END;
GO

SELECT TOP (20)
  rr.Id, rr.ReviewId, rr.ReporterUserId, rr.Reason, rr.Status, rr.CreatedAtUtc
FROM dbo.ReviewReports rr
ORDER BY rr.CreatedAtUtc DESC;
GO
