USE FlavorMap;
GO

SELECT
  CASE WHEN COL_LENGTH(N'dbo.Restaurants', N'PublicationStatus') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS PublicationStatus,
  CASE WHEN COL_LENGTH(N'dbo.Restaurants', N'VerificationStatus') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS VerificationStatus,
  CASE WHEN COL_LENGTH(N'dbo.RestaurantSubmissions', N'SubmissionType') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS SubmissionType,
  CASE WHEN COL_LENGTH(N'dbo.RestaurantSubmissions', N'ReviewChecklistJson') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS ReviewChecklist,
  CASE WHEN COL_LENGTH(N'dbo.RestaurantSubmissions', N'ClaimedRestaurantId') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS ClaimedRestaurantId,
  CASE WHEN COL_LENGTH(N'dbo.RestaurantSubmissions', N'BusinessProofUrl') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS BusinessProof,
  CASE WHEN OBJECT_ID(N'dbo.RestaurantApplicationAuditLogs', N'U') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS AuditHistoryTable;
GO

SELECT PublicationStatus, VerificationStatus, COUNT(*) AS Total
FROM dbo.Restaurants
GROUP BY PublicationStatus, VerificationStatus;
GO

SELECT name, definition
FROM sys.check_constraints
WHERE name IN (
  N'CK_Restaurants_PublicationStatus',
  N'CK_Restaurants_VerificationStatus',
  N'CK_RestaurantSubmissions_Status',
  N'CK_Submissions_SubmissionType'
);
GO

SELECT TOP (20) ApplicationId, ActorUserId, Action, FromStatus, ToStatus, Note, CreatedAtUtc
FROM dbo.RestaurantApplicationAuditLogs
ORDER BY CreatedAtUtc DESC;
GO
