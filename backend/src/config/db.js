const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || 'FlavorMap',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    connectTimeout: 15000,
  },
  pool: { max: 10, min: 0},
};

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

let pool;

const MOCK_DB_PATH = path.join(process.cwd(), 'mock-users.json');

let mockUsers = [];
if (fs.existsSync(MOCK_DB_PATH)) {
  try {
  mockUsers = JSON.parse(
    fs.readFileSync(MOCK_DB_PATH, 'utf-8')
  );
} catch {
  mockUsers = [];
}
} else {
  mockUsers = [
    { Id: 'mock-admin-id', Email: 'admin@example.com', PasswordHash: bcrypt.hashSync('password123', 10), FullName: 'Admin User', Role: 'Admin' },
    { Id: 'user-admin-id', Email: 'accminh22@gmail.com', PasswordHash: bcrypt.hashSync('password123', 10), FullName: 'Trần Minh', Role: 'Admin' }
  ];
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(mockUsers, null, 2));
}

// Add an admin user if not exists
if (!mockUsers.find(u => u.Email === 'admin@example.com')) {
    mockUsers.push({ Id: 'mock-admin-id', Email: 'admin@example.com', PasswordHash: bcrypt.hashSync('password123', 10), FullName: 'Admin User', Role: 'Admin' });
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(mockUsers, null, 2));
}
if (!mockUsers.find(u => u.Email === 'accminh22@gmail.com')) {
    mockUsers.push({ Id: 'user-admin-id', Email: 'accminh22@gmail.com', PasswordHash: bcrypt.hashSync('password123', 10), FullName: 'Trần Minh', Role: 'Admin' });
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(mockUsers, null, 2));
}

const saveMockDb = () => {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(mockUsers, null, 2));
};

const mockRestaurants = [
    { Id: '1', Name: 'Phở Gia Truyền Bát Đàn', Slug: 'pho-gia-truyen-bat-dan', Category: 'Cơm', PriceMin: 40000, PriceMax: 60000, Rating: 4.8, IsNew: false, IsFeatured: true, Address: '49 Bát Đàn', City: 'Hà Nội', District: 'Hoàn Kiếm', Description: 'Quán phở truyền thống nổi tiếng từ thời Pháp thuộc tại Hà Nội, nước dùng thanh mát, đậm đà vị bò chín nức tiếng.', OpeningTime: '06:00', ClosingTime: '20:30', Latitude: 21.0315, Longitude: 105.8458, BannerUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1ccd2d?auto=format&fit=crop&q=80&w=800' },
    { Id: '2', Name: 'Bún Chả Hương Liên', Slug: 'bun-cha-huong-lien', Category: 'Cơm', PriceMin: 40000, PriceMax: 80000, Rating: 4.6, IsNew: false, IsFeatured: true, Address: '24 Lê Văn Hưu', City: 'Hà Nội', District: 'Hai Bà Trưng', Description: 'Bún chả gia truyền nổi tiếng từng tiếp đón cựu tổng thống Mỹ Barack Obama năm 2016. Sườn nướng đậm mùi sả dưa góp giòn.', OpeningTime: '08:00', ClosingTime: '20:30', Latitude: 21.0163, Longitude: 105.8540, BannerUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800' },
    { Id: '6', Name: 'Bún bò Huế O Xuân', Slug: 'bun-bo-hue-o-xuan', Category: 'Cơm', PriceMin: 35000, PriceMax: 50000, Rating: 4.4, IsNew: true, IsFeatured: true, Address: '3 Quang Trung', City: 'Hà Nội', District: 'Hoàn Kiếm', Description: 'Món bún bò chuẩn hương vị Huế mộng mơ ngay giữa lòng thủ đô Hà Nội.', OpeningTime: '07:00', ClosingTime: '22:00', Latitude: 21.0264, Longitude: 105.8502, BannerUrl: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&q=80&w=800' },
    { Id: '10', Name: 'Cà Phê Trứng Giảng', Slug: 'ca-phe-trung-giang', Category: 'Cafe', PriceMin: 30500, PriceMax: 45000, Rating: 4.9, IsNew: false, IsFeatured: true, Address: '39 Nguyễn Hữu Huân', City: 'Hà Nội', District: 'Hoàn Kiếm', Description: 'Cái nôi của món Cà phê Trứng lừng danh Việt Nam lưu dấu ấn lịch sự ngàn năm.', OpeningTime: '07:00', ClosingTime: '22:00', Latitude: 21.0343, Longitude: 105.8550, BannerUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800' },
    
    { Id: '3', Name: 'Bánh Mì Huỳnh Hoa', Slug: 'banh-mi-huynh-hoa', Category: 'Đồ ăn vặt', PriceMin: 60000, PriceMax: 70000, Rating: 4.5, IsNew: false, IsFeatured: true, Address: '26 Lê Thị Riêng', City: 'Hồ Chí Minh', District: 'Quận 1', Description: 'Ổ bánh mì đắt sắt ra miếng trứ danh Sài Gòn với lượng pate và bơ phết cực khủng.', OpeningTime: '13:00', ClosingTime: '23:00', Latitude: 10.7711, Longitude: 106.6908, BannerUrl: 'https://images.unsplash.com/photo-1600454021970-351feb2a1884?auto=format&fit=crop&q=80&w=800' },
    { Id: '4', Name: 'Cà phê Vợt Cheo Leo', Slug: 'ca-phe-vot-cheo-leo', Category: 'Cafe', PriceMin: 20000, PriceMax: 40000, Rating: 4.8, IsNew: true, IsFeatured: true, Address: '109/36 Nguyễn Thiện Thuật', City: 'Hồ Chí Minh', District: 'Quận 3', Description: 'Căn nhà gỗ nhỏ pha chế cà phê vợt cổ điển có tuổi đời hơn 80 năm tại Chợ Lớn.', OpeningTime: '05:15', ClosingTime: '18:45', Latitude: 10.7679, Longitude: 106.6791, BannerUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800' },
    { Id: '7', Name: 'Cơm Tấm Ba Ghiền', Slug: 'com-tam-ba-ghien', Category: 'Cơm', PriceMin: 50000, PriceMax: 90000, Rating: 4.7, IsNew: false, IsFeatured: true, Address: '84 Đặng Văn Ngữ', City: 'Hồ Chí Minh', District: 'Phú Nhuận', Description: 'Miếng sườn heo nướng khổng lồ che lấp cả đĩa cơm tấm dẻo tuyệt vời.', OpeningTime: '07:00', ClosingTime: '21:00', Latitude: 10.7925, Longitude: 106.6781, BannerUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800' },
    { Id: '11', Name: 'Ốc Đào Quận 1', Slug: 'oc-dao-quan-1', Category: 'Hải sản', PriceMin: 50000, PriceMax: 150000, Rating: 4.4, IsNew: true, IsFeatured: false, Address: '212B Nguyễn Trãi', City: 'Hồ Chí Minh', District: 'Quận 1', Description: 'Quán ốc hẻm gia truyền siêu đông khách, nổi tiếng hương vị bơ tỏi ốc hương xào me.', OpeningTime: '10:00', ClosingTime: '22:00', Latitude: 10.7651, Longitude: 106.6872, BannerUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800' },

    { Id: '5', Name: 'Mì Quảng Bà Mua', Slug: 'mi-quang-ba-mua', Category: 'Cơm', PriceMin: 35000, PriceMax: 50000, Rating: 4.3, IsNew: true, IsFeatured: true, Address: '19-21 Trần Bình Trọng', City: 'Đà Nẵng', District: 'Hải Châu', Description: 'Mì Quảng ếch thơm lừng ngào ngạt tẩm ướp trọn vị miền Trung gió cát.', OpeningTime: '06:00', ClosingTime: '22:00', Latitude: 16.0682, Longitude: 108.2195, BannerUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=800' },
    { Id: '8', Name: 'Bánh Xèo Bà Dưỡng', Slug: 'banh-xeo-ba-duong', Category: 'Đồ ăn vặt', PriceMin: 40000, PriceMax: 60000, Rating: 4.6, IsNew: true, IsFeatured: true, Address: 'K280/23 Hoàng Diệu', City: 'Đà Nẵng', District: 'Hải Châu', Description: 'Bánh xèo giòn rụm màu vàng nghệ giòn tan đặc sắc chấm nước sốt tương gan béo bùi.', OpeningTime: '09:00', ClosingTime: '21:30', Latitude: 16.0592, Longitude: 108.2144, BannerUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800' },
    { Id: '12', Name: 'Hải Sản Năm Đảnh', Slug: 'hai-san-nam-danh', Category: 'Hải sản', PriceMin: 60000, PriceMax: 120000, Rating: 4.6, IsNew: false, IsFeatured: true, Address: '139/59/38 Trần Quang Khải', City: 'Đà Nẵng', District: 'Sơn Trà', Description: 'Quán hải sản đồng giá đồng quê tấp nập trong ngõ, thực đơn phong phú ngon rẻ.', OpeningTime: '10:00', ClosingTime: '21:00', Latitude: 16.0911, Longitude: 108.2435, BannerUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=800' },

    { Id: '9', Name: 'Bánh đa cua Bể Hải Phòng', Slug: 'banh-da-cua-be-hai-phong', Category: 'Cơm', PriceMin: 30000, PriceMax: 50000, Rating: 4.8, IsNew: false, IsFeatured: true, Address: '143 Trần Phú', City: 'Hải Phòng', District: 'Ngô Quyền', Description: 'Sợi bánh đa đỏ dai giòn chần chín cùng nước mắm cua đồng sánh gạch ngon tuyệt vời.', OpeningTime: '06:00', ClosingTime: '20:00', Latitude: 20.8528, Longitude: 106.6806, BannerUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800' },
    { Id: '13', Name: 'Bánh Mì Que Cay Bà Già', Slug: 'banh-mi-que-cay-ba-gia', Category: 'Đồ ăn vặt', PriceMin: 15000, PriceMax: 30000, Rating: 4.7, IsNew: true, IsFeatured: false, Address: '57 Lê Lợi', City: 'Hải Phòng', District: 'Ngô Quyền', Description: 'Món bánh mì que cay nhỏ thon phết pate ngậy kèm chí chương đặc thù đất cảng.', OpeningTime: '07:00', ClosingTime: '22:00', Latitude: 20.8550, Longitude: 106.6841, BannerUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=800' },

    { Id: '14', Name: 'Lẩu Mắm Dạ Lý Cần Thơ', Slug: 'lau-mam-da-ly-can-tho', Category: 'Khác', PriceMin: 150000, PriceMax: 300000, Rating: 4.6, IsNew: false, IsFeatured: true, Address: '89 Đường 3/2', City: 'Cần Thơ', District: 'Ninh Kiều', Description: 'Tinh hoa lẩu mắm miền Tây sông nước dồi dào các loại bông súng, bông bí ngon lịm.', OpeningTime: '10:00', ClosingTime: '22:00', Latitude: 10.0255, Longitude: 105.7725, BannerUrl: 'https://images.unsplash.com/photo-1547496502-affa284164b3?auto=format&fit=crop&q=80&w=800' },
    { Id: '15', Name: 'Nem Nướng Cái Răng Thanh Vân', Slug: 'nem-nuong-cai-rang-thanh-van', Category: 'Cơm', PriceMin: 40000, PriceMax: 80000, Rating: 4.5, IsNew: true, IsFeatured: false, Address: '14 Hòa Bình', City: 'Cần Thơ', District: 'Ninh Kiều', Description: 'Nem nướng Cái Răng nức tiếng dẻo mềm từ thịt nạc lợn quết dẻo nướng than hoa.', OpeningTime: '08:00', ClosingTime: '21:30', Latitude: 10.0335, Longitude: 105.7820, BannerUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800' },
    { Id: '16', Name: 'Bún bò Huế Mụ Rơi', Slug: 'bun-bo-hue-mu-roi', Category: 'Cơm', PriceMin: 35000, PriceMax: 50000, Rating: 4.8, IsNew: false, IsFeatured: true, Address: '40 Nguyễn Chí Diểu', City: 'Huế', District: 'Phú Hậu', Description: 'Quán bún bò lâu đời chuẩn vị Huế mặn mà cay nồng.', OpeningTime: '06:00', ClosingTime: '10:00', Latitude: 16.4716, Longitude: 107.5951, BannerUrl: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&q=80&w=800' },
    { Id: '17', Name: 'Bánh bèo nậm lọc Bà Đỏ', Slug: 'banh-beo-nam-loc-ba-do', Category: 'Đồ ăn vặt', PriceMin: 20000, PriceMax: 60000, Rating: 4.5, IsNew: true, IsFeatured: true, Address: '8 Nguyễn Bỉnh Khiêm', City: 'Huế', District: 'Phú Cát', Description: 'Đặc sản các loại bánh Huế truyền thống cực ngon.', OpeningTime: '08:00', ClosingTime: '20:00', Latitude: 16.4764, Longitude: 107.5901, BannerUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800' },
    { Id: '18', Name: 'Bún cá lá Ninh Hòa', Slug: 'bun-ca-la-ninh-hoa', Category: 'Cơm', PriceMin: 30000, PriceMax: 45000, Rating: 4.7, IsNew: true, IsFeatured: false, Address: '170 Bạch Đằng', City: 'Nha Trang', District: 'Tân Lập', Description: 'Bún cá sứa nước trong vắt, chả cá dai ngon sần sật.', OpeningTime: '06:00', ClosingTime: '21:00', Latitude: 12.2458, Longitude: 109.1956, BannerUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800' },
    { Id: '19', Name: 'TEST QUÁN MỚI', Slug: 'banh-uot-long-ga-long', Category: 'Cơm', PriceMin: 35000, PriceMax: 50000, Rating: 4.8, IsNew: false, IsFeatured: true, Address: '202/2/5 Phan Đình Phùng', City: 'Đà Lạt', District: 'Phường 2', Description: 'Bánh ướt lòng gà ngon trứ danh Đà Lạt, lòng dai ngon, bánh ướt mềm dẻo.', OpeningTime: '07:00', ClosingTime: '20:00', Latitude: 11.9442, Longitude: 108.4357, BannerUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=800' }
];

const mockMenus = [
    { RestaurantId: '1', Id: 'm1', Name: 'Phở Tái', Price: 50000, IsAvailable: true },
    { RestaurantId: '1', Id: 'm2', Name: 'Phở Chín', Price: 50000, IsAvailable: true },
    { RestaurantId: '1', Id: 'm3', Name: 'Phở Nạm', Price: 60000, IsAvailable: true },
    { RestaurantId: '2', Id: 'm4', Name: 'Bún Chả', Price: 50000, IsAvailable: true },
    { RestaurantId: '2', Id: 'm5', Name: 'Nem Cua Bể', Price: 40000, IsAvailable: true },
    { RestaurantId: '3', Id: 'm6', Name: 'Bánh Mì Thịt Phá Lấu', Price: 68000, IsAvailable: true },
    { RestaurantId: '4', Id: 'm7', Name: 'Bạc Xỉu', Price: 25000, IsAvailable: true },
    { RestaurantId: '5', Id: 'm8', Name: 'Mì Quảng Tôm Thịt', Price: 40000, IsAvailable: true },
];

let mockSubmissions = [];
let mockBookmarks = [];
let mockReviews = [];

const MOCK_RT_PATH = path.join(process.cwd(), 'mock-refresh-tokens.json');
let mockRefreshTokens = [];
if (fs.existsSync(MOCK_RT_PATH)) {
  try {
    mockRefreshTokens = JSON.parse(fs.readFileSync(MOCK_RT_PATH, 'utf-8'));
  } catch (e) {
    mockRefreshTokens = [];
  }
}
const saveMockRefreshTokens = () => {
  fs.writeFileSync(MOCK_RT_PATH, JSON.stringify(mockRefreshTokens, null, 2));
};

const getPool = async () => {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✅ Kết nối SQL Server thành công');
    } catch (err) {
        console.error('SQL SERVER ERROR:');
  console.error(err);

      console.log('⚠️ Chạy chế độ Mock Data tĩnh (Fallback) - Vui lòng cài MS SQL để chạy full API!');
      pool = {
        request: () => {
          const req = {
            parameters: {},
            input: function(name, type, value) {
              this.parameters[name] = value;
              return this;
            },
            query: async function(queryStr) {
              if (queryStr && queryStr.includes('SELECT * FROM RestaurantSubmissions')) {
                 const statusFilter = queryStr.includes("Status = 'Pending'") ? 'Pending' : 'Processed';
                 const filtered = mockSubmissions.filter(s => statusFilter === 'Pending' ? s.Status === 'Pending' : s.Status !== 'Pending');
                 return { recordset: filtered };
              }
              if (queryStr && queryStr.includes('UPDATE RestaurantSubmissions SET Status')) {
                 const sub = mockSubmissions.find(s => s.Id === this.parameters.Id);
                 if (sub) {
                     sub.Status = this.parameters.Status;
                     if (sub.Status === 'Approved') {
                         mockRestaurants.push({
                             Id: 'mock-rest-' + Date.now(),
                             Name: sub.Name,
                             Slug: sub.Name.toLowerCase().replace(/ /g, '-'),
                             Category: sub.Category || 'Khác',
                             Address: sub.Address,
                             City: sub.City || 'Hà Nội',
                             District: sub.District,
                             Description: sub.Description,
                             PriceMin: sub.SuggestedPriceMin || 0,
                             PriceMax: sub.SuggestedPriceMax || 0,
                             Latitude: sub.Latitude,
                             Longitude: sub.Longitude,
                             Rating: 0,
                             IsNew: true,
                             IsFeatured: false,
                             BannerUrl: sub.ImageUrl
                         });
                     }
                 }
                 return { recordset: [] };
              }
              if(queryStr && queryStr.includes('INSERT INTO RestaurantSubmissions')) {
                  const newSub = { Id: 'mock-sub-' + Date.now(), Name: this.parameters.Name, Address: this.parameters.Address, District: this.parameters.District, City: this.parameters.City, Category: this.parameters.Category, Description: this.parameters.Description, SuggestedPriceMin: this.parameters.PriceMin, SuggestedPriceMax: this.parameters.PriceMax, Latitude: this.parameters.Lat, Longitude: this.parameters.Lng, ImageUrl: this.parameters.ImageUrl, Status: 'Pending', CreatedAt: new Date() };
                  mockSubmissions.push(newSub);
                  return { recordset: [newSub] };
              }
              if(queryStr && queryStr.includes('SELECT Id, Email, FullName, Role, IsBanned, CreatedAt FROM Users')) {
                  return { recordset: mockUsers };
              }
              if (queryStr && queryStr.includes('UPDATE Users SET Role')) {
                  const u = mockUsers.find(x => x.Id === this.parameters.Id);
                  if (u) u.Role = this.parameters.Role;
                  return { recordset: [] };
              }
              if (queryStr && queryStr.includes('UPDATE Users SET IsBanned')) {
                  const u = mockUsers.find(x => x.Id === this.parameters.Id);
                  if (u) u.IsBanned = this.parameters.IsBanned;
                  return { recordset: [] };
              }
              if (queryStr && queryStr.includes('SELECT * FROM Users WHERE Email')) {
                 const email = Object.values(this.parameters)[0];
                 const filtered = mockUsers.filter(u => u.Email === email);
                 return { recordset: filtered }; 
              }
              if(queryStr && queryStr.includes('MERGE Reviews AS target')) {
                  const r = mockReviews.find(x => x.RestaurantId === this.parameters.RestaurantId && x.UserId === this.parameters.UserId);
                  if (r) { r.Rating = this.parameters.Rating; r.Comment = this.parameters.Comment; }
                  else mockReviews.push({ Id: 'mock-rev-' + Date.now(), RestaurantId: this.parameters.RestaurantId, UserId: this.parameters.UserId, Rating: this.parameters.Rating, Comment: this.parameters.Comment, CreatedAt: new Date() });
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('DELETE FROM Reviews WHERE')) {
                  mockReviews = mockReviews.filter(x => !(x.RestaurantId === this.parameters.RestaurantId && x.UserId === this.parameters.UserId));
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('SELECT rv.Id, rv.Rating, rv.Comment')) {
                  const rest = mockRestaurants.find(r => r.Slug === this.parameters.Slug);
                  if (!rest) return { recordsets: [[], [{ Total: 0 }]] };
                  const revs = mockReviews.filter(x => x.RestaurantId === rest.Id).map(rv => {
                      const u = mockUsers.find(u => u.Id === rv.UserId) || {};
                      return { ...rv, FullName: u.FullName, AvatarUrl: u.AvatarUrl, UserId: u.Id };
                  });
                  return { recordsets: [revs, [{ Total: revs.length }]] };
              }
              if (queryStr && queryStr.includes('SELECT * FROM Restaurants ORDER BY CreatedAt DESC')) {
                 return { recordset: mockRestaurants };
              }
              if(queryStr && (queryStr.includes('SELECT') && queryStr.includes('FROM Restaurants'))) {
                  console.log("Mock DB matched SELECT FROM Restaurants:", queryStr, this.parameters);
                  if (queryStr.includes('WHERE IsFeatured = 1') || queryStr.includes('IsFeatured = 1')) {
                      let featured = mockRestaurants.filter(r => r.IsFeatured === true);
                      if (this.parameters.City) {
                          featured = featured.filter(r => r.City === this.parameters.City);
                      }
                      return { recordsets: [featured, [{ Total: featured.length }]] };
                  }
                  if (queryStr.includes('WHERE IsNew = 1') || queryStr.includes('IsNew = 1')) {
                      let newest = mockRestaurants.filter(r => r.IsNew === true);
                      if (this.parameters.City) {
                          newest = newest.filter(r => r.City === this.parameters.City);
                      }
                      return { recordsets: [newest, [{ Total: newest.length }]] };
                  }
                  
                  if (queryStr.includes('WHERE r.Slug = @Slug') || queryStr.includes('WHERE Slug = @Slug')) {
                      const slug = this.parameters.Slug;
                      const rest = mockRestaurants.find(r => r.Slug === slug);
                      if (rest) {
                          const menus = mockMenus.filter(m => m.RestaurantId === rest.Id);
                          return { recordsets: [[rest], menus], recordset: [rest] };
                      }
                      return { recordsets: [[],[]], recordset: [] };
                  }
                  
                  // Filter
                  let filtered = [...mockRestaurants];
                  if (this.parameters.Category) filtered = filtered.filter(f => f.Category === this.parameters.Category);
                  if (this.parameters.City) filtered = filtered.filter(f => f.City === this.parameters.City);
                  if (this.parameters.PriceMax) filtered = filtered.filter(f => f.PriceMin <= this.parameters.PriceMax);
                  if (this.parameters.PriceMin) filtered = filtered.filter(f => f.PriceMax >= this.parameters.PriceMin);
                  if (this.parameters.Keyword) {
                      const lower = this.parameters.Keyword.replace(/%/g, '').toLowerCase();
                      filtered = filtered.filter(f => f.Name.toLowerCase().includes(lower) || f.Description.toLowerCase().includes(lower));
                  }
                  if (this.parameters.Q) {
                      const lower = this.parameters.Q.replace(/%/g, '').toLowerCase();
                      filtered = filtered.filter(f => f.Name.toLowerCase().includes(lower) || f.Description.toLowerCase().includes(lower));
                  }
                  
                  // Haversine distance calculations in Mock
                  if (this.parameters.Lat && this.parameters.Lng && this.parameters.Radius) {
                      const lat1 = parseFloat(this.parameters.Lat);
                      const lon1 = parseFloat(this.parameters.Lng);
                      const rad = parseFloat(this.parameters.Radius);
                      filtered = filtered.filter(r => {
                          if (r.Latitude === null || r.Longitude === null || r.Latitude === undefined || r.Longitude === undefined) return false;
                          const lat2 = parseFloat(r.Latitude);
                          const lon2 = parseFloat(r.Longitude);
                          const R = 6371; // km
                          const dLat = (lat2 - lat1) * Math.PI / 180;
                          const dLon = (lon2 - lon1) * Math.PI / 180;
                          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                    Math.sin(dLon/2) * Math.sin(dLon/2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                          const d = R * c;
                          r.DistanceKm = d; // inject DistanceKm in mock result
                          return d <= rad;
                      });
                  }
                  
                  return { recordsets: [filtered, [{ Total: filtered.length }]] };
              }
              if(queryStr && queryStr.includes('SELECT r.Id, r.Name, r.Slug') && queryStr.includes('Bookmarks')) { // for getBookmarks
                  const myBms = mockBookmarks.filter(b => b.UserId === this.parameters.UserId);
                  const result = myBms.map(b => {
                      const r = mockRestaurants.find(x => x.Id === b.RestaurantId);
                      return r ? { ...r, BookmarkedAt: b.CreatedAt } : null;
                  }).filter(Boolean);
                  return { recordsets: [result, [{ Total: result.length }]] };
              }
              if(queryStr && queryStr.includes('SELECT RestaurantId FROM Bookmarks')) {
                  return { recordset: mockBookmarks.filter(b => b.UserId === this.parameters.UserId) };
              }
              if (queryStr && queryStr.includes('SELECT * FROM MenuItems WHERE RestaurantId')) {
                  const items = mockMenus.filter(m => m.RestaurantId === this.parameters.RestaurantId);
                  return { recordset: items };
              }
              if (queryStr && queryStr.includes('INSERT INTO MenuItems')) {
                  const newItem = { Id: 'mock-menu-' + Date.now(), RestaurantId: this.parameters.RestaurantId, Name: this.parameters.Name, Description: this.parameters.Description, Price: this.parameters.Price, ImageUrl: this.parameters.ImageUrl, IsAvailable: this.parameters.IsAvailable === 1, CreatedAt: new Date() };
                  mockMenus.push(newItem);
                  return { recordset: [newItem] };
              }
              if (queryStr && queryStr.includes('UPDATE MenuItems SET Name')) {
                  const item = mockMenus.find(m => m.Id === this.parameters.Id);
                  if (item) {
                      item.Name = this.parameters.Name;
                      item.Description = this.parameters.Description;
                      item.Price = this.parameters.Price;
                      item.ImageUrl = this.parameters.ImageUrl;
                      item.IsAvailable = this.parameters.IsAvailable === 1;
                  }
                  return { recordset: [] };
              }
              if (queryStr && queryStr.includes('DELETE FROM MenuItems WHERE Id')) {
                  const idx = mockMenus.findIndex(m => m.Id === this.parameters.Id);
                  if (idx !== -1) mockMenus.splice(idx, 1);
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('INSERT INTO Bookmarks')) {
                  mockBookmarks.push({ UserId: this.parameters.UserId, RestaurantId: this.parameters.RestaurantId, CreatedAt: new Date() });
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('DELETE b FROM Bookmarks b')) {
                  const rest = mockRestaurants.find(r => r.Slug === this.parameters.Slug);
                  if (rest) {
                      mockBookmarks = mockBookmarks.filter(b => !(b.UserId === this.parameters.UserId && b.RestaurantId === rest.Id));
                  }
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('UPDATE Restaurants') && queryStr.includes('SET Rating =')) {
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('UPDATE Restaurants SET Name=@Name')) {
                  const rest = mockRestaurants.find(r => r.Id === this.parameters.Id);
                  if (rest) {
                      rest.Name = this.parameters.Name;
                      rest.Address = this.parameters.Address;
                      rest.City = this.parameters.City;
                      rest.District = this.parameters.District;
                      rest.Category = this.parameters.Category;
                      rest.Description = this.parameters.Description;
                      rest.PriceMin = parseInt(this.parameters.PriceMin) || 0;
                      rest.PriceMax = parseInt(this.parameters.PriceMax) || 0;
                      rest.OpeningTime = this.parameters.OpeningTime;
                      rest.ClosingTime = this.parameters.ClosingTime;
                      rest.BannerUrl = this.parameters.BannerUrl;
                      rest.IsFeatured = this.parameters.IsFeatured === 1;
                      rest.IsNew = this.parameters.IsNew === 1;
                  }
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('INSERT INTO Restaurants')) {
                  const newRest = {
                      Id: 'mock-rest-' + Date.now(),
                      Name: this.parameters.Name,
                      Slug: this.parameters.Slug || this.parameters.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      Address: this.parameters.Address,
                      City: this.parameters.City,
                      District: this.parameters.District,
                      Category: this.parameters.Category || 'Khác',
                      Description: this.parameters.Description,
                      PriceMin: parseInt(this.parameters.PriceMin) || 0,
                      PriceMax: parseInt(this.parameters.PriceMax) || 0,
                      OpeningTime: this.parameters.OpeningTime || '08:00',
                      ClosingTime: this.parameters.ClosingTime || '22:00',
                      BannerUrl: this.parameters.BannerUrl || 'https://images.unsplash.com/photo-1547496502-affa284164b3?auto=format&fit=crop&q=80&w=800',
                      Rating: 5.0,
                      IsNew: this.parameters.IsNew === 1,
                      IsFeatured: this.parameters.IsFeatured === 1,
                      CreatedAt: new Date()
                  };
                  mockRestaurants.push(newRest);
                  return { recordset: [newRest] };
              }
              if(queryStr && queryStr.includes('DELETE FROM Restaurants WHERE Id = @Id')) {
                  const id = this.parameters.Id;
                  const idx = mockRestaurants.findIndex(r => r.Id === id);
                  if (idx !== -1) mockRestaurants.splice(idx, 1);
                  return { recordset: [] };
              }
              if (queryStr && queryStr.includes('INSERT INTO Users')) {
                 const newUser = {
                     Id: 'mock-' + Date.now(),
                     FullName: this.parameters.FullName,
                     Email: this.parameters.Email,
                     PasswordHash: this.parameters.PasswordHash,
                     Role: 'User',
                     CreatedAt: new Date()
                 };
                 mockUsers.push(newUser);
                 saveMockDb();
                 return { recordset: [newUser] };
              }
              if (queryStr && queryStr.includes('INSERT INTO RefreshTokens')) {
                  mockRefreshTokens.push({
                      UserId: this.parameters.UserId,
                      Token: this.parameters.Token,
                      ExpiresAt: this.parameters.ExpiresAt
                  });
                  saveMockRefreshTokens();
                  return { recordset: [] };
              }
              if (queryStr && queryStr.includes('DELETE FROM RefreshTokens')) {
                  mockRefreshTokens = mockRefreshTokens.filter(rt => rt.Token !== this.parameters.Token);
                  saveMockRefreshTokens();
                  return { recordset: [] };
              }
              if (queryStr && queryStr.includes('SELECT rt.*, u.FullName, u.Email')) {
                  const token = this.parameters.Token;
                  const rt = mockRefreshTokens.find(r => r.Token === token && new Date(r.ExpiresAt) > new Date());
                  if (rt) {
                      const user = mockUsers.find(u => u.Id === rt.UserId);
                      if (user) {
                          return { recordset: [{ ...rt, FullName: user.FullName, Email: user.Email }] };
                      }
                  }
                  return { recordset: [] };
              }
              if(queryStr && queryStr.includes('SELECT ') && queryStr.includes('FROM Users') && !queryStr.includes('WHERE')) {
                  return { recordset: mockUsers.map(u => ({...u, PasswordHash: undefined, Role: u.Role || 'User'})) };
              }
              if(queryStr && queryStr.includes('UPDATE Users SET Role')) {
                  const user = mockUsers.find(u => u.Id === this.parameters.Id);
                  if(user) user.Role = this.parameters.Role;
                  return { rowsAffected: [1] };
              }
              if(queryStr && queryStr.includes('UPDATE Users SET IsBanned')) {
                  const user = mockUsers.find(u => u.Id === this.parameters.Id);
                  if(user) user.IsBanned = this.parameters.IsBanned;
                  return { rowsAffected: [1] };
              }
              if (queryStr && queryStr.includes('SELECT Id FROM Users WHERE Email')) {
                 const email = Object.values(this.parameters)[0];
                 const filtered = mockUsers.filter(u => u.Email === email);
                 return { recordset: filtered };
              }
              if (queryStr && queryStr.includes('SELECT Id, Name, Slug, Description')) {
                  const slug = this.parameters.Slug;
                  const rest = mockRestaurants.find(r => r.Slug === slug);
                  if (rest) {
                      const menus = mockMenus.filter(m => m.RestaurantId === rest.Id);
                      return { recordsets: [[rest], menus], recordset: [rest] };
                  }
                  return { recordsets: [[],[]], recordset: [] };
              }
              if (queryStr && queryStr.includes('SELECT Id, FullName, Email, AvatarUrl')) {
                 const id = Object.values(this.parameters)[0];
                 const filtered = mockUsers.filter(u => u.Id === id);
                 return { recordset: filtered };
              }
              if (queryStr && queryStr.includes('UPDATE Users')) {
                 const id = this.parameters.Id;
                 const u = mockUsers.find(u => u.Id === id);
                 if (u) {
                     u.FullName = this.parameters.FullName || u.FullName;
                     u.Phone = this.parameters.Phone || u.Phone;
                     u.AvatarUrl = this.parameters.AvatarUrl || u.AvatarUrl;
                     if(this.parameters.Hash) u.PasswordHash = this.parameters.Hash;
                     saveMockDb();
                 }
                 return { recordset: u ? [u] : [] };
              }
              if (queryStr && queryStr.includes('SELECT PasswordHash FROM Users WHERE Id')) {
                 const id = Object.values(this.parameters)[0];
                 return { recordset: mockUsers.filter(u => u.Id === id) };
              }

              return { recordset: [], recordsets: [[], [{ Total: 0 }], []] };
            }
          };
          return req;
        }
      };
    }
  }
  return pool;
};

module.exports = { getPool, sql };
