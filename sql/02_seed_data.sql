
DELETE FROM MenuItems;
DELETE FROM Restaurants;

DECLARE @RestaurantMap TABLE(
    Slug NVARCHAR(255),
    RestaurantId UNIQUEIDENTIFIER
);


DECLARE @id_1 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_1,
 N'Phở Gia Truyền Bát Đàn',
 'pho-gia-truyen-bat-dan',
 N'Quán phở truyền thống nổi tiếng từ thời Pháp thuộc tại Hà Nội, nước dùng thanh mát, đậm đà vị bò chín nức tiếng.',
 N'49 Bát Đàn',
 N'Hà Nội',
 N'Hoàn Kiếm',
 21.0315,
 105.8458,
 N'Cơm',
 40000,
 60000,
 '06:00',
 '20:30',
 'https://images.unsplash.com/photo-1582878826629-29b7ad1ccd2d?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.8,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('pho-gia-truyen-bat-dan', @id_1);

DECLARE @id_2 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_2,
 N'Bún Chả Hương Liên',
 'bun-cha-huong-lien',
 N'Bún chả gia truyền nổi tiếng từng tiếp đón cựu tổng thống Mỹ Barack Obama năm 2016. Sườn nướng đậm mùi sả dưa góp giòn.',
 N'24 Lê Văn Hưu',
 N'Hà Nội',
 N'Hai Bà Trưng',
 21.0163,
 105.854,
 N'Cơm',
 40000,
 80000,
 '08:00',
 '20:30',
 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.6,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('bun-cha-huong-lien', @id_2);

DECLARE @id_6 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_6,
 N'Bún bò Huế O Xuân',
 'bun-bo-hue-o-xuan',
 N'Món bún bò chuẩn hương vị Huế mộng mơ ngay giữa lòng thủ đô Hà Nội.',
 N'3 Quang Trung',
 N'Hà Nội',
 N'Hoàn Kiếm',
 21.0264,
 105.8502,
 N'Cơm',
 35000,
 50000,
 '07:00',
 '22:00',
 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&q=80&w=800',
 1,
 1,
 4.4,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('bun-bo-hue-o-xuan', @id_6);

DECLARE @id_10 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_10,
 N'Cà Phê Trứng Giảng',
 'ca-phe-trung-giang',
 N'Cái nôi của món Cà phê Trứng lừng danh Việt Nam lưu dấu ấn lịch sự ngàn năm.',
 N'39 Nguyễn Hữu Huân',
 N'Hà Nội',
 N'Hoàn Kiếm',
 21.0343,
 105.855,
 N'Cafe',
 30500,
 45000,
 '07:00',
 '22:00',
 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.9,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('ca-phe-trung-giang', @id_10);

DECLARE @id_3 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_3,
 N'Bánh Mì Huỳnh Hoa',
 'banh-mi-huynh-hoa',
 N'Ổ bánh mì đắt sắt ra miếng trứ danh Sài Gòn với lượng pate và bơ phết cực khủng.',
 N'26 Lê Thị Riêng',
 N'Hồ Chí Minh',
 N'Quận 1',
 10.7711,
 106.6908,
 N'Đồ ăn vặt',
 60000,
 70000,
 '13:00',
 '23:00',
 'https://images.unsplash.com/photo-1600454021970-351feb2a1884?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.5,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('banh-mi-huynh-hoa', @id_3);

DECLARE @id_4 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_4,
 N'Cà phê Vợt Cheo Leo',
 'ca-phe-vot-cheo-leo',
 N'Căn nhà gỗ nhỏ pha chế cà phê vợt cổ điển có tuổi đời hơn 80 năm tại Chợ Lớn.',
 N'109/36 Nguyễn Thiện Thuật',
 N'Hồ Chí Minh',
 N'Quận 3',
 10.7679,
 106.6791,
 N'Cafe',
 20000,
 40000,
 '05:15',
 '18:45',
 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800',
 1,
 1,
 4.8,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('ca-phe-vot-cheo-leo', @id_4);

DECLARE @id_7 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_7,
 N'Cơm Tấm Ba Ghiền',
 'com-tam-ba-ghien',
 N'Miếng sườn heo nướng khổng lồ che lấp cả đĩa cơm tấm dẻo tuyệt vời.',
 N'84 Đặng Văn Ngữ',
 N'Hồ Chí Minh',
 N'Phú Nhuận',
 10.7925,
 106.6781,
 N'Cơm',
 50000,
 90000,
 '07:00',
 '21:00',
 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.7,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('com-tam-ba-ghien', @id_7);

DECLARE @id_11 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_11,
 N'Ốc Đào Quận 1',
 'oc-dao-quan-1',
 N'Quán ốc hẻm gia truyền siêu đông khách, nổi tiếng hương vị bơ tỏi ốc hương xào me.',
 N'212B Nguyễn Trãi',
 N'Hồ Chí Minh',
 N'Quận 1',
 10.7651,
 106.6872,
 N'Hải sản',
 50000,
 150000,
 '10:00',
 '22:00',
 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800',
 0,
 1,
 4.4,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('oc-dao-quan-1', @id_11);

DECLARE @id_5 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_5,
 N'Mì Quảng Bà Mua',
 'mi-quang-ba-mua',
 N'Mì Quảng ếch thơm lừng ngào ngạt tẩm ướp trọn vị miền Trung gió cát.',
 N'19-21 Trần Bình Trọng',
 N'Đà Nẵng',
 N'Hải Châu',
 16.0682,
 108.2195,
 N'Cơm',
 35000,
 50000,
 '06:00',
 '22:00',
 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=800',
 1,
 1,
 4.3,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('mi-quang-ba-mua', @id_5);

DECLARE @id_8 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_8,
 N'Bánh Xèo Bà Dưỡng',
 'banh-xeo-ba-duong',
 N'Bánh xèo giòn rụm màu vàng nghệ giòn tan đặc sắc chấm nước sốt tương gan béo bùi.',
 N'K280/23 Hoàng Diệu',
 N'Đà Nẵng',
 N'Hải Châu',
 16.0592,
 108.2144,
 N'Đồ ăn vặt',
 40000,
 60000,
 '09:00',
 '21:30',
 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800',
 1,
 1,
 4.6,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('banh-xeo-ba-duong', @id_8);

DECLARE @id_12 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_12,
 N'Hải Sản Năm Đảnh',
 'hai-san-nam-danh',
 N'Quán hải sản đồng giá đồng quê tấp nập trong ngõ, thực đơn phong phú ngon rẻ.',
 N'139/59/38 Trần Quang Khải',
 N'Đà Nẵng',
 N'Sơn Trà',
 16.0911,
 108.2435,
 N'Hải sản',
 60000,
 120000,
 '10:00',
 '21:00',
 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.6,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('hai-san-nam-danh', @id_12);

DECLARE @id_9 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_9,
 N'Bánh đa cua Bể Hải Phòng',
 'banh-da-cua-be-hai-phong',
 N'Sợi bánh đa đỏ dai giòn chần chín cùng nước mắm cua đồng sánh gạch ngon tuyệt vời.',
 N'143 Trần Phú',
 N'Hải Phòng',
 N'Ngô Quyền',
 20.8528,
 106.6806,
 N'Cơm',
 30000,
 50000,
 '06:00',
 '20:00',
 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.8,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('banh-da-cua-be-hai-phong', @id_9);

DECLARE @id_13 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_13,
 N'Bánh Mì Que Cay Bà Già',
 'banh-mi-que-cay-ba-gia',
 N'Món bánh mì que cay nhỏ thon phết pate ngậy kèm chí chương đặc thù đất cảng.',
 N'57 Lê Lợi',
 N'Hải Phòng',
 N'Ngô Quyền',
 20.855,
 106.6841,
 N'Đồ ăn vặt',
 15000,
 30000,
 '07:00',
 '22:00',
 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=800',
 0,
 1,
 4.7,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('banh-mi-que-cay-ba-gia', @id_13);

DECLARE @id_14 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_14,
 N'Lẩu Mắm Dạ Lý Cần Thơ',
 'lau-mam-da-ly-can-tho',
 N'Tinh hoa lẩu mắm miền Tây sông nước dồi dào các loại bông súng, bông bí ngon lịm.',
 N'89 Đường 3/2',
 N'Cần Thơ',
 N'Ninh Kiều',
 10.0255,
 105.7725,
 N'Khác',
 150000,
 300000,
 '10:00',
 '22:00',
 'https://images.unsplash.com/photo-1547496502-affa284164b3?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.6,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('lau-mam-da-ly-can-tho', @id_14);

DECLARE @id_15 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_15,
 N'Nem Nướng Cái Răng Thanh Vân',
 'nem-nuong-cai-rang-thanh-van',
 N'Nem nướng Cái Răng nức tiếng dẻo mềm từ thịt nạc lợn quết dẻo nướng than hoa.',
 N'14 Hòa Bình',
 N'Cần Thơ',
 N'Ninh Kiều',
 10.0335,
 105.782,
 N'Cơm',
 40000,
 80000,
 '08:00',
 '21:30',
 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800',
 0,
 1,
 4.5,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('nem-nuong-cai-rang-thanh-van', @id_15);

DECLARE @id_16 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_16,
 N'Bún bò Huế Mụ Rơi',
 'bun-bo-hue-mu-roi',
 N'Quán bún bò lâu đời chuẩn vị Huế mặn mà cay nồng.',
 N'40 Nguyễn Chí Diểu',
 N'Huế',
 N'Phú Hậu',
 16.4716,
 107.5951,
 N'Cơm',
 35000,
 50000,
 '06:00',
 '10:00',
 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.8,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('bun-bo-hue-mu-roi', @id_16);

DECLARE @id_17 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_17,
 N'Bánh bèo nậm lọc Bà Đỏ',
 'banh-beo-nam-loc-ba-do',
 N'Đặc sản các loại bánh Huế truyền thống cực ngon.',
 N'8 Nguyễn Bỉnh Khiêm',
 N'Huế',
 N'Phú Cát',
 16.4764,
 107.5901,
 N'Đồ ăn vặt',
 20000,
 60000,
 '08:00',
 '20:00',
 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800',
 1,
 1,
 4.5,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('banh-beo-nam-loc-ba-do', @id_17);

DECLARE @id_18 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_18,
 N'Bún cá lá Ninh Hòa',
 'bun-ca-la-ninh-hoa',
 N'Bún cá sứa nước trong vắt, chả cá dai ngon sần sật.',
 N'170 Bạch Đằng',
 N'Nha Trang',
 N'Tân Lập',
 12.2458,
 109.1956,
 N'Cơm',
 30000,
 45000,
 '06:00',
 '21:00',
 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800',
 0,
 1,
 4.7,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('bun-ca-la-ninh-hoa', @id_18);

DECLARE @id_19 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Restaurants
(
 Id,Name,Slug,Description,Address,
 City,District,Latitude,Longitude,
 Category,PriceMin,PriceMax,
 OpeningTime,ClosingTime,
 BannerUrl,IsFeatured,IsNew,
 Rating,CreatedAt,UpdatedAt
)
VALUES
(
 @id_19,
 N'Bánh ướt lòng gà Long',
 'banh-uot-long-ga-long',
 N'Bánh ướt lòng gà ngon trứ danh Đà Lạt, lòng dai ngon, bánh ướt mềm dẻo.',
 N'202/2/5 Phan Đình Phùng',
 N'Đà Lạt',
 N'Phường 2',
 11.9442,
 108.4357,
 N'Cơm',
 35000,
 50000,
 '07:00',
 '20:00',
 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=800',
 1,
 0,
 4.8,
 GETDATE(),
 GETDATE()
);

INSERT INTO @RestaurantMap VALUES('banh-uot-long-ga-long', @id_19);

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Phở Tái',
 NULL,
 50000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='pho-gia-truyen-bat-dan';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Phở Chín',
 NULL,
 50000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='pho-gia-truyen-bat-dan';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Phở Nạm',
 NULL,
 60000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='pho-gia-truyen-bat-dan';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bún Chả Đặc Biệt',
 NULL,
 50000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='bun-cha-huong-lien';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Nem Cua Bể',
 NULL,
 40000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='bun-cha-huong-lien';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bánh Mì Đặc Biệt',
 NULL,
 68000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='banh-mi-huynh-hoa';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bạc Xỉu',
 NULL,
 25000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='ca-phe-vot-cheo-leo';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Cà Phê Đen',
 NULL,
 20000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='ca-phe-vot-cheo-leo';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Mì Quảng Tôm Thịt',
 NULL,
 40000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='mi-quang-ba-mua';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bún Bò Đặc Biệt',
 NULL,
 50000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='bun-bo-hue-o-xuan';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Cà Phê Trứng',
 NULL,
 45000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='ca-phe-trung-giang';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Cơm Tấm Sườn',
 NULL,
 70000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='com-tam-ba-ghien';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Ốc Hương Xào Bơ Tỏi',
 NULL,
 120000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='oc-dao-quan-1';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bánh Xèo',
 NULL,
 50000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='banh-xeo-ba-duong';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Tôm Nướng',
 NULL,
 100000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='hai-san-nam-danh';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bánh Đa Cua',
 NULL,
 45000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='banh-da-cua-be-hai-phong';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bánh Mì Que Cay',
 NULL,
 15000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='banh-mi-que-cay-ba-gia';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Lẩu Mắm',
 NULL,
 250000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='lau-mam-da-ly-can-tho';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Nem Nướng',
 NULL,
 60000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='nem-nuong-cai-rang-thanh-van';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bún Bò Huế',
 NULL,
 50000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='bun-bo-hue-mu-roi';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bánh Bèo',
 NULL,
 30000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='banh-beo-nam-loc-ba-do';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bún Cá',
 NULL,
 40000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='bun-ca-la-ninh-hoa';

INSERT INTO MenuItems
(
 Id,
 RestaurantId,
 Name,
 Description,
 Price,
 ImageUrl,
 IsAvailable,
 CreatedAt
)
SELECT
 NEWID(),
 RestaurantId,
 N'Bánh Ướt Lòng Gà',
 NULL,
 50000,
 NULL,
 1,
 GETDATE()
FROM @RestaurantMap
WHERE Slug='banh-uot-long-ga-long';
