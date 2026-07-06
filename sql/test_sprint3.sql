-- File: backend/sql/03_sprint3_tables.sql
USE FlavorMap;
GO

-- ===== REVIEWS (đánh giá 5 sao + bình luận) =====
CREATE TABLE Reviews (
    Id           UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    RestaurantId UNIQUEIDENTIFIER NOT NULL
                 FOREIGN KEY REFERENCES Restaurants(Id) ON DELETE CASCADE,
    UserId       UNIQUEIDENTIFIER NOT NULL
                 FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    Rating       INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment      NVARCHAR(1000) NULL,
    CreatedAt    DATETIME2 DEFAULT GETDATE(),
    UpdatedAt    DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_Review_User_Restaurant UNIQUE (UserId, RestaurantId)
);
CREATE INDEX IX_Reviews_RestaurantId ON Reviews(RestaurantId);

-- ===== BOOKMARKS (quán ăn yêu thích) =====
CREATE TABLE Bookmarks (
    Id           UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    UserId       UNIQUEIDENTIFIER NOT NULL
                 FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    RestaurantId UNIQUEIDENTIFIER NOT NULL
                 FOREIGN KEY REFERENCES Restaurants(Id) ON DELETE CASCADE,
    CreatedAt    DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_Bookmark_User_Restaurant UNIQUE (UserId, RestaurantId)
);
CREATE INDEX IX_Bookmarks_UserId ON Bookmarks(UserId);

-- ===== RESTAURANT SUBMISSIONS (đề xuất quán ăn mới từ user) =====
CREATE TABLE RestaurantSubmissions (
    Id                UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    SubmittedByUserId UNIQUEIDENTIFIER NOT NULL
                      FOREIGN KEY REFERENCES Users(Id),
    Name              NVARCHAR(200) NOT NULL,
    Address           NVARCHAR(300) NOT NULL,
    District          NVARCHAR(100) NULL,
    City              NVARCHAR(100) NULL DEFAULT N'Hà Nội',
    Category          NVARCHAR(50)  NULL,
    Description       NVARCHAR(MAX) NULL,
    SuggestedPriceMin INT NULL,
    SuggestedPriceMax INT NULL,
    Latitude          FLOAT NULL,
    Longitude         FLOAT NULL,
    ImageUrl          NVARCHAR(500) NULL,
    Status            NVARCHAR(20) DEFAULT 'Pending'
                      CHECK (Status IN ('Pending','Approved','Rejected')),
    CreatedAt         DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX IX_Submissions_Status ON RestaurantSubmissions(Status);
