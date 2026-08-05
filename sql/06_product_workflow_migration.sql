USE FlavorMap;
GO

SET XACT_ABORT ON;
GO

/* =========================================================
   FLAVORMAP PRODUCT WORKFLOW
   - Only verified/published restaurants are public
   - Owner applications have multi-step review states
   - Approval assigns ownership and records audit data
   ========================================================= */

/* ---------- RESTAURANT PUBLICATION / VERIFICATION ---------- */
IF COL_LENGTH(N'dbo.Restaurants', N'PublicationStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Restaurants
      ADD PublicationStatus NVARCHAR(30) NOT NULL
          CONSTRAINT DF_Restaurants_PublicationStatus DEFAULT N'Published';
END;
GO

IF COL_LENGTH(N'dbo.Restaurants', N'VerificationStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Restaurants
      ADD VerificationStatus NVARCHAR(30) NOT NULL
          CONSTRAINT DF_Restaurants_VerificationStatus DEFAULT N'Verified';
END;
GO

IF COL_LENGTH(N'dbo.Restaurants', N'VerifiedAtUtc') IS NULL
    ALTER TABLE dbo.Restaurants ADD VerifiedAtUtc DATETIME2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Restaurants', N'VerifiedByUserId') IS NULL
    ALTER TABLE dbo.Restaurants ADD VerifiedByUserId UNIQUEIDENTIFIER NULL;
GO
IF COL_LENGTH(N'dbo.Restaurants', N'LastVerifiedAtUtc') IS NULL
    ALTER TABLE dbo.Restaurants ADD LastVerifiedAtUtc DATETIME2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Restaurants', N'PublicationNote') IS NULL
    ALTER TABLE dbo.Restaurants ADD PublicationNote NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.Restaurants', N'PublicationUpdatedAtUtc') IS NULL
    ALTER TABLE dbo.Restaurants ADD PublicationUpdatedAtUtc DATETIME2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Restaurants', N'SourceType') IS NULL
BEGIN
    ALTER TABLE dbo.Restaurants
      ADD SourceType NVARCHAR(30) NOT NULL
          CONSTRAINT DF_Restaurants_SourceType DEFAULT N'ExistingData';
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Restaurants_VerifiedBy')
BEGIN
    ALTER TABLE dbo.Restaurants WITH CHECK
      ADD CONSTRAINT FK_Restaurants_VerifiedBy
      FOREIGN KEY (VerifiedByUserId) REFERENCES dbo.Users(Id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Restaurants_PublicationStatus')
BEGIN
    ALTER TABLE dbo.Restaurants WITH CHECK
      ADD CONSTRAINT CK_Restaurants_PublicationStatus
      CHECK (PublicationStatus IN (N'Draft', N'PendingApproval', N'Published', N'Hidden', N'Suspended'));
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Restaurants_VerificationStatus')
BEGIN
    ALTER TABLE dbo.Restaurants WITH CHECK
      ADD CONSTRAINT CK_Restaurants_VerificationStatus
      CHECK (VerificationStatus IN (N'Unverified', N'UnderReview', N'Verified', N'NeedsReverification', N'Rejected'));
END;
GO

UPDATE dbo.Restaurants
SET PublicationStatus = COALESCE(NULLIF(PublicationStatus, N''), N'Published'),
    VerificationStatus = COALESCE(NULLIF(VerificationStatus, N''), N'Verified'),
    VerifiedAtUtc = COALESCE(VerifiedAtUtc, SYSUTCDATETIME()),
    LastVerifiedAtUtc = COALESCE(LastVerifiedAtUtc, SYSUTCDATETIME())
WHERE PublicationStatus IS NULL
   OR VerificationStatus IS NULL
   OR VerifiedAtUtc IS NULL
   OR LastVerifiedAtUtc IS NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Restaurants')
      AND name = N'IX_Restaurants_PublicVerification'
)
BEGIN
    CREATE INDEX IX_Restaurants_PublicVerification
      ON dbo.Restaurants(PublicationStatus, VerificationStatus)
      INCLUDE (Name, Slug, City, Category, Rating, CreatedAt);
END;
GO

/* ---------- OWNER APPLICATION DETAILS ---------- */
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'SubmissionType') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD SubmissionType NVARCHAR(30) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'ClaimedRestaurantId') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD ClaimedRestaurantId UNIQUEIDENTIFIER NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Submissions_ClaimedRestaurant')
BEGIN
    ALTER TABLE dbo.RestaurantSubmissions WITH CHECK
      ADD CONSTRAINT FK_Submissions_ClaimedRestaurant
      FOREIGN KEY (ClaimedRestaurantId) REFERENCES dbo.Restaurants(Id);
END;
GO

IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'OwnerPhone') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD OwnerPhone NVARCHAR(30) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'OwnerEmail') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD OwnerEmail NVARCHAR(200) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'OwnerRelationship') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD OwnerRelationship NVARCHAR(50) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'StorePhone') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD StorePhone NVARCHAR(30) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'WebsiteUrl') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD WebsiteUrl NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'FacebookUrl') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD FacebookUrl NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'ZaloPhone') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD ZaloPhone NVARCHAR(30) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'OpeningTime') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD OpeningTime TIME NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'ClosingTime') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD ClosingTime TIME NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'BusinessProofUrl') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD BusinessProofUrl NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'StorefrontImageUrl') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD StorefrontImageUrl NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'InteriorImageUrl') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD InteriorImageUrl NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'MenuProofUrl') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD MenuProofUrl NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'AdminNote') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD AdminNote NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'RejectionReason') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD RejectionReason NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'ReviewChecklistJson') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD ReviewChecklistJson NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'UpdatedAtUtc') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD UpdatedAtUtc DATETIME2(3) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'SubmittedAtUtc') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD SubmittedAtUtc DATETIME2(3) NULL;
GO
IF COL_LENGTH(N'dbo.RestaurantSubmissions', N'ReviewStartedAtUtc') IS NULL
    ALTER TABLE dbo.RestaurantSubmissions ADD ReviewStartedAtUtc DATETIME2(3) NULL;
GO

/* Drop the old unnamed/legacy status check before expanding statuses. */
DECLARE @OldStatusConstraint SYSNAME;
SELECT TOP (1) @OldStatusConstraint = cc.name
FROM sys.check_constraints cc
JOIN sys.columns c
  ON c.object_id = cc.parent_object_id
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.RestaurantSubmissions')
  AND cc.definition LIKE N'%Status%'
  AND cc.name <> N'CK_RestaurantSubmissions_Status';

IF @OldStatusConstraint IS NOT NULL
BEGIN
    EXEC(N'ALTER TABLE dbo.RestaurantSubmissions DROP CONSTRAINT ' + QUOTENAME(@OldStatusConstraint));
END;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_RestaurantSubmissions_Status')
    ALTER TABLE dbo.RestaurantSubmissions DROP CONSTRAINT CK_RestaurantSubmissions_Status;
GO

/* Replace the legacy Pending default with the new Draft default. */
DECLARE @OldStatusDefault SYSNAME;
SELECT @OldStatusDefault = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c
  ON c.object_id = dc.parent_object_id
 AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.RestaurantSubmissions')
  AND c.name = N'Status';

IF @OldStatusDefault IS NOT NULL
BEGIN
    EXEC(N'ALTER TABLE dbo.RestaurantSubmissions DROP CONSTRAINT ' + QUOTENAME(@OldStatusDefault));
END;
GO

/* Normalize legacy rows before the new status constraint is checked. */
UPDATE dbo.RestaurantSubmissions
SET SubmissionType = COALESCE(SubmissionType, N'MissingRestaurantLead'),
    Status = CASE WHEN Status = N'Pending' THEN N'Submitted' ELSE Status END,
    UpdatedAtUtc = COALESCE(UpdatedAtUtc, CreatedAt),
    SubmittedAtUtc = CASE
        WHEN Status IN (N'Pending', N'Submitted', N'UnderReview', N'NeedsChanges', N'Approved', N'Rejected')
        THEN COALESCE(SubmittedAtUtc, CreatedAt)
        ELSE SubmittedAtUtc
    END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_Submissions_Status')
BEGIN
    ALTER TABLE dbo.RestaurantSubmissions
      ADD CONSTRAINT DF_Submissions_Status DEFAULT N'Draft' FOR Status;
END;
GO

ALTER TABLE dbo.RestaurantSubmissions WITH CHECK
  ADD CONSTRAINT CK_RestaurantSubmissions_Status
  CHECK (Status IN (N'Draft', N'Submitted', N'UnderReview', N'NeedsChanges', N'Approved', N'Rejected'));
GO

ALTER TABLE dbo.RestaurantSubmissions ALTER COLUMN SubmissionType NVARCHAR(30) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_Submissions_SubmissionType')
BEGIN
    ALTER TABLE dbo.RestaurantSubmissions
      ADD CONSTRAINT DF_Submissions_SubmissionType DEFAULT N'OwnerCreate' FOR SubmissionType;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Submissions_SubmissionType')
BEGIN
    ALTER TABLE dbo.RestaurantSubmissions WITH CHECK
      ADD CONSTRAINT CK_Submissions_SubmissionType
      CHECK (SubmissionType IN (N'OwnerCreate', N'OwnerClaim', N'MissingRestaurantLead'));
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.RestaurantSubmissions')
      AND name = N'IX_Submissions_StatusType'
)
BEGIN
    CREATE INDEX IX_Submissions_StatusType
      ON dbo.RestaurantSubmissions(Status, SubmissionType, CreatedAt DESC)
      INCLUDE (SubmittedByUserId, Name, City, StorePhone);
END;
GO


/* ---------- APPLICATION REVIEW AUDIT HISTORY ---------- */
IF OBJECT_ID(N'dbo.RestaurantApplicationAuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RestaurantApplicationAuditLogs (
        Id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_RestaurantApplicationAuditLogs PRIMARY KEY
            CONSTRAINT DF_ApplicationAuditLogs_Id DEFAULT NEWID(),
        ApplicationId UNIQUEIDENTIFIER NOT NULL,
        ActorUserId UNIQUEIDENTIFIER NULL,
        Action NVARCHAR(50) NOT NULL,
        FromStatus NVARCHAR(20) NULL,
        ToStatus NVARCHAR(20) NULL,
        Note NVARCHAR(2000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL
            CONSTRAINT DF_ApplicationAuditLogs_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ApplicationAuditLogs_Application
            FOREIGN KEY (ApplicationId) REFERENCES dbo.RestaurantSubmissions(Id),
        CONSTRAINT FK_ApplicationAuditLogs_Actor
            FOREIGN KEY (ActorUserId) REFERENCES dbo.Users(Id)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.RestaurantApplicationAuditLogs')
      AND name = N'IX_ApplicationAuditLogs_ApplicationTime'
)
BEGIN
    CREATE INDEX IX_ApplicationAuditLogs_ApplicationTime
      ON dbo.RestaurantApplicationAuditLogs(ApplicationId, CreatedAtUtc DESC)
      INCLUDE (ActorUserId, Action, FromStatus, ToStatus);
END;
GO

PRINT N'FlavorMap product workflow migration completed successfully.';
GO
