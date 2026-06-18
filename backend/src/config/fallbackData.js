const restaurants = [
  {
    Id: '00000000-0000-0000-0000-000000000001',
    Name: 'Cafe Trung Nguyên',
    Slug: 'cafe-trung-nguyen',
    Description: 'Cà phê rang xay truyền thống Việt Nam, không gian yên tĩnh.',
    Address: '12 Nguyễn Huệ',
    City: 'Hà Nội',
    District: 'Hoàn Kiếm',
    Latitude: 21.0285,
    Longitude: 105.8542,
    Category: 'Cafe',
    PriceMin: 25000,
    PriceMax: 65000,
    OpeningTime: '07:00',
    ClosingTime: '22:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 1,
    IsNew: 0,
    Rating: 4.5,
  },
  {
    Id: '00000000-0000-0000-0000-000000000002',
    Name: 'Phở Thìn Bờ Hồ',
    Slug: 'pho-thin-bo-ho',
    Description: 'Phở bò Hà Nội truyền thống, nước dùng ninh 12 tiếng.',
    Address: '61 Đinh Tiên Hoàng',
    City: 'Hà Nội',
    District: 'Hoàn Kiếm',
    Latitude: 21.03,
    Longitude: 105.852,
    Category: 'Cơm',
    PriceMin: 45000,
    PriceMax: 80000,
    OpeningTime: '06:00',
    ClosingTime: '14:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 1,
    IsNew: 0,
    Rating: 4.8,
  },
  {
    Id: '00000000-0000-0000-0000-000000000003',
    Name: 'Xôi Yến',
    Slug: 'xoi-yen',
    Description: 'Xôi ngon nức tiếng Hà Nội, đa dạng topping.',
    Address: '35B Nguyễn Hữu Huân',
    City: 'Hà Nội',
    District: 'Hoàn Kiếm',
    Latitude: 21.034,
    Longitude: 105.851,
    Category: 'Đồ ăn vặt',
    PriceMin: 20000,
    PriceMax: 50000,
    OpeningTime: '06:30',
    ClosingTime: '12:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 0,
    IsNew: 1,
    Rating: 4.6,
  },
  {
    Id: '00000000-0000-0000-0000-000000000004',
    Name: 'Bún Bò Huế Mợ Tôi',
    Slug: 'bun-bo-hue-mo-toi',
    Description: 'Bún bò Huế cay nồng, đúng vị miền Trung.',
    Address: '87 Hàng Điếu',
    City: 'Hà Nội',
    District: 'Hoàn Kiếm',
    Latitude: 21.0352,
    Longitude: 105.8459,
    Category: 'Cơm',
    PriceMin: 35000,
    PriceMax: 70000,
    OpeningTime: '07:00',
    ClosingTime: '21:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 0,
    IsNew: 1,
    Rating: 4.3,
  },
  {
    Id: '00000000-0000-0000-0000-000000000005',
    Name: 'Trà Chanh Vỉa Hè',
    Slug: 'tra-chanh-via-he',
    Description: 'Trà chanh giải nhiệt, không gian vỉa hè thú vị.',
    Address: 'Phố Nhà Thờ',
    City: 'Hà Nội',
    District: 'Hoàn Kiếm',
    Latitude: 21.029,
    Longitude: 105.849,
    Category: 'Nước',
    PriceMin: 15000,
    PriceMax: 30000,
    OpeningTime: '10:00',
    ClosingTime: '23:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 0,
    IsNew: 1,
    Rating: 4.1,
  },
  {
    Id: '00000000-0000-0000-0000-000000000006',
    Name: 'Hải Sản Biển Đông',
    Slug: 'hai-san-bien-dong',
    Description: 'Hải sản tươi sống, chế biến đa dạng.',
    Address: '45 Láng Hạ',
    City: 'Hà Nội',
    District: 'Đống Đa',
    Latitude: 21.0198,
    Longitude: 105.8282,
    Category: 'Hải sản',
    PriceMin: 150000,
    PriceMax: 500000,
    OpeningTime: '11:00',
    ClosingTime: '22:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 1,
    IsNew: 0,
    Rating: 4.4,
  },
  {
    Id: '00000000-0000-0000-0000-000000000007',
    Name: 'Cơm Tấm Sài Gòn',
    Slug: 'com-tam-sai-gon',
    Description: 'Cơm tấm sườn bì chả, hương vị Nam Bộ giữa lòng Hà Nội.',
    Address: '23 Tôn Thất Tùng',
    City: 'Hà Nội',
    District: 'Đống Đa',
    Latitude: 21.017,
    Longitude: 105.834,
    Category: 'Cơm',
    PriceMin: 40000,
    PriceMax: 90000,
    OpeningTime: '07:00',
    ClosingTime: '21:30',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 0,
    IsNew: 1,
    Rating: 4.2,
  },
  {
    Id: '00000000-0000-0000-0000-000000000008',
    Name: 'The Coffee House',
    Slug: 'the-coffee-house-hoan-kiem',
    Description: 'Chuỗi cafe hiện đại, WiFi mạnh, đồ uống đa dạng.',
    Address: '78 Hai Bà Trưng',
    City: 'Hà Nội',
    District: 'Hoàn Kiếm',
    Latitude: 21.0269,
    Longitude: 105.8519,
    Category: 'Cafe',
    PriceMin: 35000,
    PriceMax: 85000,
    OpeningTime: '07:00',
    ClosingTime: '22:30',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 1,
    IsNew: 0,
    Rating: 4.3,
  },
  {
    Id: '00000000-0000-0000-0000-000000000009',
    Name: 'Bánh Mì 25',
    Slug: 'banh-mi-25',
    Description: 'Bánh mì Việt Nam nổi tiếng trên các trang du lịch quốc tế.',
    Address: '25 Hàng Cá',
    City: 'Hà Nội',
    District: 'Hoàn Kiếm',
    Latitude: 21.0337,
    Longitude: 105.8488,
    Category: 'Đồ ăn vặt',
    PriceMin: 25000,
    PriceMax: 45000,
    OpeningTime: '06:00',
    ClosingTime: '20:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 1,
    IsNew: 0,
    Rating: 4.7,
  },
  {
    Id: '00000000-0000-0000-0000-000000000010',
    Name: 'Bún Chả Obama',
    Slug: 'bun-cha-obama',
    Description: 'Bún chả Hà Nội nổi tiếng, nơi Tổng thống Obama từng ghé thăm.',
    Address: '24 Lê Văn Hưu',
    City: 'Hà Nội',
    District: 'Hai Bà Trưng',
    Latitude: 21.0235,
    Longitude: 105.8505,
    Category: 'Cơm',
    PriceMin: 40000,
    PriceMax: 80000,
    OpeningTime: '08:00',
    ClosingTime: '20:00',
    BannerUrl: '/assets/images/placeholder.svg',
    IsFeatured: 1,
    IsNew: 0,
    Rating: 4.6,
  },
];

const menuItems = [
  {
    Id: '10000000-0000-0000-0000-000000000001',
    RestaurantId: '00000000-0000-0000-0000-000000000001',
    Name: 'Cà Phê Đen Đá',
    Description: 'Cà phê phin truyền thống pha đá',
    Price: 25000,
    ImageUrl: '/assets/images/placeholder.svg',
    IsAvailable: 1,
  },
  {
    Id: '10000000-0000-0000-0000-000000000002',
    RestaurantId: '00000000-0000-0000-0000-000000000001',
    Name: 'Cà Phê Sữa Đá',
    Description: 'Cà phê phin với sữa đặc và đá',
    Price: 30000,
    ImageUrl: '/assets/images/placeholder.svg',
    IsAvailable: 1,
  },
  {
    Id: '10000000-0000-0000-0000-000000000003',
    RestaurantId: '00000000-0000-0000-0000-000000000001',
    Name: 'Bạc Xỉu',
    Description: 'Sữa đặc nhiều, cà phê ít, vị ngọt thanh',
    Price: 32000,
    ImageUrl: '/assets/images/placeholder.svg',
    IsAvailable: 1,
  },
];

restaurants.forEach((restaurant) => {
  restaurant.BannerUrl =
    `/assets/images/restaurants/${restaurant.Slug}.jpg`;
});

const normalizeText = (text) =>
  (text || '').toString().toLowerCase();

const matchesKeyword = (restaurant, keyword) => {
  const lower = keyword.toLowerCase();
  if (normalizeText(restaurant.Name).includes(lower)) return true;
  if (normalizeText(restaurant.Description).includes(lower)) return true;
  if (normalizeText(restaurant.Address).includes(lower)) return true;
  const restaurantMenu = menuItems.filter((item) => item.RestaurantId === restaurant.Id);
  return restaurantMenu.some((item) => normalizeText(item.Name).includes(lower));
};

const getRestaurants = ({ type, page = 1, limit = 12 }) => {
  let data = [...restaurants];
  if (type === 'featured') data = data.filter((r) => r.IsFeatured === 1);
  if (type === 'newest') data = data.filter((r) => r.IsNew === 1);
  const total = data.length;
  const offset = (page - 1) * limit;
  const pageData = data.slice(offset, offset + limit);
  return {
    data: pageData,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / limit),
  };
};

const searchRestaurants = ({ q, page = 1, limit = 12 }) => {
  const keyword = q.trim();
  const matched = restaurants.filter((r) => matchesKeyword(r, keyword));
  const total = matched.length;
  const offset = (page - 1) * limit;
  return {
    data: matched.slice(offset, offset + limit),
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / limit),
  };
};

const filterRestaurants = ({ category, priceMin, priceMax, q, page = 1, limit = 12 }) => {
  let data = [...restaurants];
  if (category) data = data.filter((r) => r.Category === category);
  if (priceMin !== undefined && priceMin !== '') data = data.filter((r) => r.PriceMax >= parseInt(priceMin, 10));
  if (priceMax !== undefined && priceMax !== '') data = data.filter((r) => r.PriceMin <= parseInt(priceMax, 10));
  if (q) data = data.filter((r) => matchesKeyword(r, q));
  const total = data.length;
  const offset = (page - 1) * limit;
  return {
    data: data.slice(offset, offset + limit),
    total,
    page: parseInt(page, 10),
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
};

const getRestaurantBySlug = (slug) => {
  const restaurant = restaurants.find((r) => r.Slug === slug);
  if (!restaurant) return null;
  const menu = menuItems.filter((item) => item.RestaurantId === restaurant.Id);
  return { ...restaurant, menuItems: menu };
};

module.exports = {
  getRestaurants,
  searchRestaurants,
  filterRestaurants,
  getRestaurantBySlug,
};
