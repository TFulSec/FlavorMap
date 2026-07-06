const { getPool, sql } = require('../../config/db');

exports.getSubmissions = async (statusFilter) => {
    const pool = await getPool();
    // Default mock response or actual query.
    // Given the mock engine handles it, we should pass it an explicit string.
    let statusQuery = statusFilter === 'Processed' ? "Status IN ('Approved', 'Rejected')" : "Status = 'Pending'";

    const result = await pool.request().query(`SELECT * FROM RestaurantSubmissions WHERE ${statusQuery} ORDER BY CreatedAt DESC`);
    
    return result.recordset || [];
};

exports.updateSubmissionStatus = async (id, status) => {
    const pool = await getPool();
    await pool.request()
       .input('Id', sql.UniqueIdentifier, id)
       .input('Status', sql.NVarChar, status)
       .query('UPDATE RestaurantSubmissions SET Status = @Status WHERE Id = @Id');

    // If status is Approved, we ideally should insert it into Restaurants. 
    // For now, our mock engine will handle it.
};

exports.getUsers = async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT Id, Email, FullName, Role, IsBanned, CreatedAt FROM Users ORDER BY CreatedAt DESC');
    return result.recordset || [];
};

exports.updateUserRole = async (id, role) => {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.UniqueIdentifier, id)
        .input('Role', sql.NVarChar, role)
        .query('UPDATE Users SET Role = @Role WHERE Id = @Id');
};

exports.banUser = async (id, isBanned) => {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.UniqueIdentifier, id)
        .input('IsBanned', sql.Bit, isBanned ? 1 : 0)
        .query('UPDATE Users SET IsBanned = @IsBanned WHERE Id = @Id');
};

const makeSlug = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
        .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
        .replace(/ì|í|ị|ỉ|ĩ/g, 'i')
        .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
        .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
        .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
};

exports.getRestaurants = async () => {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT *
        FROM Restaurants
        ORDER BY CreatedAt DESC
    `);

    const restaurants = (result.recordset || []).map(r => {
        console.log('RAW OPEN:', r.OpeningTime);
        console.log('RAW CLOSE:', r.ClosingTime);

        let openingTime = '08:00';
        let closingTime = '22:00';

        if (r.OpeningTime) {
            const d = new Date(r.OpeningTime);
            openingTime =
                String(d.getUTCHours()).padStart(2, '0') +
                ':' +
                String(d.getUTCMinutes()).padStart(2, '0');
        }

        if (r.ClosingTime) {
            const d = new Date(r.ClosingTime);
            closingTime =
                String(d.getUTCHours()).padStart(2, '0') +
                ':' +
                String(d.getUTCMinutes()).padStart(2, '0');
        }

        return {
            ...r,
            OpeningTime: openingTime,
            ClosingTime: closingTime
        };
    });

    console.log('FIXED OPEN:', restaurants[0]?.OpeningTime);
    console.log('FIXED CLOSE:', restaurants[0]?.ClosingTime);

    return restaurants;
};
exports.createRestaurant = async (data) => {
    const pool = await getPool();
    const slug = makeSlug(data.Name);
    const result = await pool.request()
        .input('Name', sql.NVarChar, data.Name)
        .input('Slug', sql.NVarChar, slug)
        .input('Address', sql.NVarChar, data.Address)
        .input('City', sql.NVarChar, data.City)
        .input('District', sql.NVarChar, data.District || null)
        .input('Category', sql.NVarChar, data.Category || 'Khác')
        .input('Description', sql.NVarChar, data.Description || null)
        .input('PriceMin', sql.Int, parseInt(data.PriceMin) || 0)
        .input('PriceMax', sql.Int, parseInt(data.PriceMax) || 0)
        .input('OpeningTime', sql.VarChar, data.OpeningTime || '08:00')
        .input('ClosingTime', sql.VarChar, data.ClosingTime || '22:00')
        .input('BannerUrl', sql.NVarChar, data.BannerUrl || 'https://images.unsplash.com/photo-1547496502-affa284164b3?auto=format&fit=crop&q=80&w=800')
        .input('IsFeatured', sql.Bit, data.IsFeatured ? 1 : 0)
        .input('IsNew', sql.Bit, data.IsNew ? 1 : 0)
        .query(`
            INSERT INTO Restaurants (Name, Slug, Address, City, District, Category, Description, PriceMin, PriceMax, OpeningTime, ClosingTime, BannerUrl, Rating, IsFeatured, IsNew, CreatedAt)
            VALUES (@Name, @Slug, @Address, @City, @District, @Category, @Description, @PriceMin, @PriceMax, @OpeningTime, @ClosingTime, @BannerUrl, 5.0, @IsFeatured, @IsNew, GETDATE());
            SELECT @@IDENTITY AS Id;
        `);
    return result.recordset || [];
};

exports.updateRestaurant = async (id, data) => {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.UniqueIdentifier, id)
        .input('Name', sql.NVarChar, data.Name)
        .input('Address', sql.NVarChar, data.Address)
        .input('City', sql.NVarChar, data.City)
        .input('District', sql.NVarChar, data.District || null)
        .input('Category', sql.NVarChar, data.Category)
        .input('Description', sql.NVarChar, data.Description || null)
        .input('PriceMin', sql.Int, parseInt(data.PriceMin) || 0)
        .input('PriceMax', sql.Int, parseInt(data.PriceMax) || 0)
        .input('OpeningTime', sql.VarChar, data.OpeningTime || '08:00')
        .input('ClosingTime', sql.VarChar, data.ClosingTime || '22:00')
        .input('BannerUrl', sql.NVarChar, data.BannerUrl || '')
        .input('IsFeatured', sql.Bit, data.IsFeatured ? 1 : 0)
        .input('IsNew', sql.Bit, data.IsNew ? 1 : 0)
        .query('UPDATE Restaurants SET Name=@Name, Address=@Address, City=@City, District=@District, Category=@Category, Description=@Description, PriceMin=@PriceMin, PriceMax=@PriceMax, OpeningTime=@OpeningTime, ClosingTime=@ClosingTime, BannerUrl=@BannerUrl, IsFeatured=@IsFeatured, IsNew=@IsNew WHERE Id=@Id');
};

exports.deleteRestaurant = async (id) => {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.UniqueIdentifier, id)
        .query('DELETE FROM Restaurants WHERE Id = @Id');
};

exports.getMenuByRestaurantId = async (restaurantId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .query('SELECT * FROM MenuItems WHERE RestaurantId = @RestaurantId ORDER BY CreatedAt DESC');
    return result.recordset || [];
};

exports.addMenuItem = async (restaurantId, data) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .input('Name', sql.NVarChar, data.Name)
        .input('Description', sql.NVarChar, data.Description || null)
        .input('Price', sql.Int, parseInt(data.Price) || 0)
        .input('ImageUrl', sql.NVarChar, data.ImageUrl || null)
        .input('IsAvailable', sql.Bit, data.IsAvailable ? 1 : 0)
        .query(`
            INSERT INTO MenuItems (RestaurantId, Name, Description, Price, ImageUrl, IsAvailable, CreatedAt)
            VALUES (@RestaurantId, @Name, @Description, @Price, @ImageUrl, @IsAvailable, GETDATE());
            SELECT @@IDENTITY AS Id;
        `);
    return result.recordset || [];
};

exports.updateMenuItem = async (id, data) => {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.UniqueIdentifier, id)
        .input('Name', sql.NVarChar, data.Name)
        .input('Description', sql.NVarChar, data.Description || null)
        .input('Price', sql.Int, parseInt(data.Price) || 0)
        .input('ImageUrl', sql.NVarChar, data.ImageUrl || null)
        .input('IsAvailable', sql.Bit, data.IsAvailable ? 1 : 0)
        .query('UPDATE MenuItems SET Name=@Name, Description=@Description, Price=@Price, ImageUrl=@ImageUrl, IsAvailable=@IsAvailable WHERE Id=@Id');
};

exports.deleteMenuItem = async (id) => {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.UniqueIdentifier, id)
        .query('DELETE FROM MenuItems WHERE Id = @Id');
};
