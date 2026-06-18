USE master;
GO

IF DB_ID('FlavorMapDB') IS NOT NULL
BEGIN
    ALTER DATABASE FlavorMapDB
    SET SINGLE_USER
    WITH ROLLBACK IMMEDIATE;

    DROP DATABASE FlavorMapDB;
END
GO

CREATE DATABASE FlavorMapDB;
GO

USE FlavorMapDB;
GO

/* =====================================================
   USERS
===================================================== */

CREATE TABLE Users
(
    Id UNIQUEIDENTIFIER
        PRIMARY KEY
        DEFAULT NEWID(),

    FullName NVARCHAR(100) NOT NULL,

    Email NVARCHAR(150)
        NOT NULL
        UNIQUE,

    PasswordHash NVARCHAR(255) NOT NULL,

    AvatarUrl NVARCHAR(1000)
        DEFAULT '../assets/images/default-avatar.svg',

    Phone NVARCHAR(20) NULL,

    CreatedAt DATETIME2
        DEFAULT GETDATE(),

    UpdatedAt DATETIME2
        DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Users_Email
ON Users(Email);
GO

/* =====================================================
   REFRESH TOKENS
===================================================== */

CREATE TABLE RefreshTokens
(
    Id UNIQUEIDENTIFIER
        PRIMARY KEY
        DEFAULT NEWID(),

    UserId UNIQUEIDENTIFIER NOT NULL,

    Token NVARCHAR(MAX) NOT NULL,

    ExpiresAt DATETIME2 NOT NULL,

    CreatedAt DATETIME2
        DEFAULT GETDATE(),

    CONSTRAINT FK_RefreshTokens_User
        FOREIGN KEY (UserId)
        REFERENCES Users(Id)
        ON DELETE CASCADE
);
GO

CREATE INDEX IX_RefreshTokens_UserId
ON RefreshTokens(UserId);
GO

/* =====================================================
   RESTAURANTS
===================================================== */

CREATE TABLE Restaurants
(
    Id UNIQUEIDENTIFIER
        PRIMARY KEY
        DEFAULT NEWID(),

    Name NVARCHAR(200) NOT NULL,

    Slug NVARCHAR(220)
        NOT NULL
        UNIQUE,

    Description NVARCHAR(MAX) NULL,

    Address NVARCHAR(300) NOT NULL,

    City NVARCHAR(100)
        NOT NULL
        DEFAULT N'Hà Nội',

    District NVARCHAR(100) NULL,

    Latitude FLOAT NULL,

    Longitude FLOAT NULL,

    Category NVARCHAR(50)
        NOT NULL
        CHECK (
            Category IN
            (
                N'Phở',
                N'Bún',
                N'Bánh mì',
                N'Cơm',
                N'Cafe',
                N'Trà sữa',
                N'Hải sản',
                N'Đồ ăn vặt',
                N'Khác'
            )
        ),

    PriceMin INT
        NOT NULL
        DEFAULT 0,

    PriceMax INT
        NOT NULL
        DEFAULT 0,

    OpeningTime TIME NULL,

    ClosingTime TIME NULL,

    BannerUrl NVARCHAR(1000) NULL,

    IsFeatured BIT
        DEFAULT 0,

    IsNew BIT
        DEFAULT 1,

    IsDeleted BIT
        DEFAULT 0,

    Rating DECIMAL(3,1)
        DEFAULT 0,

    CreatedAt DATETIME2
        DEFAULT GETDATE(),

    UpdatedAt DATETIME2
        DEFAULT GETDATE(),

    CONSTRAINT CK_Restaurant_Price
        CHECK (PriceMax >= PriceMin),

    CONSTRAINT CK_Restaurant_Rating
        CHECK (Rating >= 0 AND Rating <= 5)
);
GO

CREATE INDEX IX_Restaurants_Category
ON Restaurants(Category);
GO

CREATE INDEX IX_Restaurants_Rating
ON Restaurants(Rating DESC);
GO

CREATE INDEX IX_Restaurants_City
ON Restaurants(City);
GO

CREATE INDEX IX_Restaurants_IsFeatured
ON Restaurants(IsFeatured);
GO

/* =====================================================
   MENU ITEMS
===================================================== */

CREATE TABLE MenuItems
(
    Id UNIQUEIDENTIFIER
        PRIMARY KEY
        DEFAULT NEWID(),

    RestaurantId UNIQUEIDENTIFIER NOT NULL,

    Name NVARCHAR(200) NOT NULL,

    Description NVARCHAR(500) NULL,

    Price INT
        NOT NULL
        DEFAULT 0,

    ImageUrl NVARCHAR(1000) NULL,

    IsAvailable BIT
        DEFAULT 1,

    IsDeleted BIT
        DEFAULT 0,

    CreatedAt DATETIME2
        DEFAULT GETDATE(),

    CONSTRAINT FK_MenuItems_Restaurant
        FOREIGN KEY (RestaurantId)
        REFERENCES Restaurants(Id)
        ON DELETE CASCADE
);
GO

CREATE INDEX IX_MenuItems_RestaurantId
ON MenuItems(RestaurantId);
GO

CREATE INDEX IX_MenuItems_IsAvailable
ON MenuItems(IsAvailable);
GO

/* =====================================================
   UPDATED AT TRIGGERS
===================================================== */

CREATE TRIGGER TR_Users_UpdatedAt
ON Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(UpdatedAt)
        RETURN;

    UPDATE u
    SET UpdatedAt = GETDATE()
    FROM Users u
    INNER JOIN inserted i
        ON u.Id = i.Id;
END
GO

CREATE TRIGGER TR_Restaurants_UpdatedAt
ON Restaurants
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(UpdatedAt)
        RETURN;

    UPDATE r
    SET UpdatedAt = GETDATE()
    FROM Restaurants r
    INNER JOIN inserted i
        ON r.Id = i.Id;
END
GO

/* =====================================================
   SAMPLE CHECK
===================================================== */

SELECT * FROM Users;
SELECT * FROM Restaurants;
SELECT * FROM MenuItems;
GO