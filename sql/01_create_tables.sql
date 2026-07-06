IF DB_ID('FlavorMap') IS NULL
BEGIN
    CREATE DATABASE FlavorMap;
END
GO

USE FlavorMap;
GO

/* ==========================================
   USERS
========================================== */

CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,

    AvatarUrl NVARCHAR(500) NULL,
    Phone NVARCHAR(20) NULL,

    Role NVARCHAR(20) NOT NULL DEFAULT 'User',
    IsBanned BIT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Users_Email
ON Users(Email);
GO

/* ==========================================
   REFRESH TOKENS
========================================== */

CREATE TABLE RefreshTokens (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    UserId UNIQUEIDENTIFIER NOT NULL
        FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,

    Token NVARCHAR(MAX) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_RefreshTokens_UserId
ON RefreshTokens(UserId);
GO

/* ==========================================
   RESTAURANTS
========================================== */

CREATE TABLE Restaurants (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    Name NVARCHAR(200) NOT NULL,
    Slug NVARCHAR(220) NOT NULL UNIQUE,

    Description NVARCHAR(MAX) NULL,

    Address NVARCHAR(300) NOT NULL,
    City NVARCHAR(100) NOT NULL DEFAULT N'Hà Nội',
    District NVARCHAR(100) NULL,

    Latitude FLOAT NULL,
    Longitude FLOAT NULL,

    Category NVARCHAR(50) NOT NULL
        CHECK (
            Category IN (
                N'Cafe',
                N'Cơm',
                N'Đồ ăn vặt',
                N'Nước',
                N'Hải sản',
                N'Khác'
            )
        ),

    PriceMin INT NOT NULL DEFAULT 0,
    PriceMax INT NOT NULL DEFAULT 0,

    OpeningTime TIME NULL,
    ClosingTime TIME NULL,

    BannerUrl NVARCHAR(500) NULL,

    IsFeatured BIT NOT NULL DEFAULT 0,
    IsNew BIT NOT NULL DEFAULT 1,

    Rating DECIMAL(3,2) NOT NULL DEFAULT 0,

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CK_Restaurants_Price
    CHECK (
        PriceMin >= 0
        AND PriceMax >= PriceMin
    )
);
GO

CREATE INDEX IX_Restaurants_Category
ON Restaurants(Category);
GO

CREATE INDEX IX_Restaurants_Rating
ON Restaurants(Rating DESC);
GO

CREATE INDEX IX_Restaurants_Slug
ON Restaurants(Slug);
GO

CREATE INDEX IX_Restaurants_City
ON Restaurants(City);
GO

CREATE INDEX IX_Restaurants_IsFeatured
ON Restaurants(IsFeatured);
GO

CREATE INDEX IX_Restaurants_IsNew
ON Restaurants(IsNew);
GO

/* ==========================================
   MENU ITEMS
========================================== */

CREATE TABLE MenuItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    RestaurantId UNIQUEIDENTIFIER NOT NULL
        FOREIGN KEY REFERENCES Restaurants(Id) ON DELETE CASCADE,

    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,

    Price INT NOT NULL DEFAULT 0,

    ImageUrl NVARCHAR(500) NULL,

    IsAvailable BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CK_MenuItems_Price
    CHECK (Price >= 0)
);
GO

CREATE INDEX IX_MenuItems_RestaurantId
ON MenuItems(RestaurantId);
GO

/* ==========================================
   REVIEWS
========================================== */

CREATE TABLE Reviews (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    RestaurantId UNIQUEIDENTIFIER NOT NULL
        FOREIGN KEY REFERENCES Restaurants(Id) ON DELETE CASCADE,

    UserId UNIQUEIDENTIFIER NOT NULL
        FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,

    Rating INT NOT NULL
        CHECK (Rating BETWEEN 1 AND 5),

    Comment NVARCHAR(1000) NULL,

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_Review_User_Restaurant
        UNIQUE(UserId, RestaurantId)
);
GO

CREATE INDEX IX_Reviews_RestaurantId
ON Reviews(RestaurantId);
GO

/* ==========================================
   BOOKMARKS
========================================== */

CREATE TABLE Bookmarks (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    UserId UNIQUEIDENTIFIER NOT NULL
        FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,

    RestaurantId UNIQUEIDENTIFIER NOT NULL
        FOREIGN KEY REFERENCES Restaurants(Id) ON DELETE CASCADE,

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_Bookmark_User_Restaurant
        UNIQUE(UserId, RestaurantId)
);
GO

CREATE INDEX IX_Bookmarks_UserId
ON Bookmarks(UserId);
GO

/* ==========================================
   RESTAURANT SUBMISSIONS
========================================== */

CREATE TABLE RestaurantSubmissions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    SubmittedByUserId UNIQUEIDENTIFIER NOT NULL
        FOREIGN KEY REFERENCES Users(Id),

    Name NVARCHAR(200) NOT NULL,

    Address NVARCHAR(300) NOT NULL,

    District NVARCHAR(100) NULL,

    City NVARCHAR(100) NULL DEFAULT N'Hà Nội',

    Category NVARCHAR(50) NULL,

    Description NVARCHAR(MAX) NULL,

    SuggestedPriceMin INT NULL,
    SuggestedPriceMax INT NULL,

    Latitude FLOAT NULL,
    Longitude FLOAT NULL,

    ImageUrl NVARCHAR(500) NULL,

    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (
            Status IN (
                'Pending',
                'Approved',
                'Rejected'
            )
        ),

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Submissions_Status
ON RestaurantSubmissions(Status);
GO

/* ==========================================
   TRIGGERS
========================================== */

CREATE TRIGGER TR_Users_UpdateTimestamp
ON Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET UpdatedAt = GETDATE()
    WHERE Id IN (
        SELECT Id
        FROM inserted
    );
END;
GO

CREATE TRIGGER TR_Restaurants_UpdateTimestamp
ON Restaurants
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Restaurants
    SET UpdatedAt = GETDATE()
    WHERE Id IN (
        SELECT Id
        FROM inserted
    );
END;
GO

CREATE TRIGGER TR_Reviews_UpdateTimestamp
ON Reviews
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Reviews
    SET UpdatedAt = GETDATE()
    WHERE Id IN (
        SELECT Id
        FROM inserted
    );
END;
GO