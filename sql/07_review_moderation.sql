USE [FlavorMap];
GO
SET XACT_ABORT ON;
GO

BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.Reviews', 'IsHidden') IS NULL
    ALTER TABLE dbo.Reviews ADD IsHidden BIT NOT NULL CONSTRAINT DF_Reviews_IsHidden DEFAULT (0);

  IF COL_LENGTH('dbo.Reviews', 'ModerationReason') IS NULL
    ALTER TABLE dbo.Reviews ADD ModerationReason NVARCHAR(500) NULL;

  IF COL_LENGTH('dbo.Reviews', 'ModeratedByUserId') IS NULL
    ALTER TABLE dbo.Reviews ADD ModeratedByUserId UNIQUEIDENTIFIER NULL;

  IF COL_LENGTH('dbo.Reviews', 'ModeratedAtUtc') IS NULL
    ALTER TABLE dbo.Reviews ADD ModeratedAtUtc DATETIME2(3) NULL;

  IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Reviews_ModeratedByUser'
  )
  BEGIN
    ALTER TABLE dbo.Reviews WITH CHECK
      ADD CONSTRAINT FK_Reviews_ModeratedByUser
      FOREIGN KEY (ModeratedByUserId) REFERENCES dbo.Users(Id);
  END;

  IF OBJECT_ID(N'dbo.ReviewReports', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.ReviewReports (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ReviewReports PRIMARY KEY DEFAULT NEWID(),
      ReviewId UNIQUEIDENTIFIER NOT NULL,
      ReporterUserId UNIQUEIDENTIFIER NOT NULL,
      Reason NVARCHAR(50) NOT NULL,
      Details NVARCHAR(500) NULL,
      Status NVARCHAR(20) NOT NULL CONSTRAINT DF_ReviewReports_Status DEFAULT N'Pending',
      CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ReviewReports_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
      ResolvedAtUtc DATETIME2(3) NULL,
      ResolvedByUserId UNIQUEIDENTIFIER NULL,
      ResolutionNote NVARCHAR(500) NULL,
      CONSTRAINT FK_ReviewReports_Review FOREIGN KEY (ReviewId) REFERENCES dbo.Reviews(Id) ON DELETE CASCADE,
      CONSTRAINT FK_ReviewReports_Reporter FOREIGN KEY (ReporterUserId) REFERENCES dbo.Users(Id),
      CONSTRAINT FK_ReviewReports_Resolver FOREIGN KEY (ResolvedByUserId) REFERENCES dbo.Users(Id),
      CONSTRAINT CK_ReviewReports_Reason CHECK (Reason IN (N'Spam', N'Offensive', N'FalseInformation', N'ConflictOfInterest', N'Other')),
      CONSTRAINT CK_ReviewReports_Status CHECK (Status IN (N'Pending', N'Resolved', N'Dismissed'))
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ReviewReports_ReviewId_Status' AND object_id = OBJECT_ID(N'dbo.ReviewReports'))
    CREATE INDEX IX_ReviewReports_ReviewId_Status ON dbo.ReviewReports(ReviewId, Status, CreatedAtUtc DESC);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ReviewReports_Pending_User_Review' AND object_id = OBJECT_ID(N'dbo.ReviewReports'))
    CREATE UNIQUE INDEX UX_ReviewReports_Pending_User_Review
      ON dbo.ReviewReports(ReviewId, ReporterUserId)
      WHERE Status = N'Pending';

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Reviews_IsHidden_Restaurant' AND object_id = OBJECT_ID(N'dbo.Reviews'))
    CREATE INDEX IX_Reviews_IsHidden_Restaurant ON dbo.Reviews(RestaurantId, IsHidden, CreatedAt DESC);

  COMMIT TRANSACTION;
  PRINT N'07_review_moderation.sql completed successfully.';
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO
