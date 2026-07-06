const { getPool, sql } = require('../../config/db');

const createSubmission = async (userId, body, imageFile) => {
  const pool = await getPool();
  const imageUrl = imageFile ? `/uploads/submissions/${imageFile.filename}` : null;

  const result = await pool.request()
    .input('UserId',      sql.UniqueIdentifier, userId)
    .input('Name',        sql.NVarChar, body.name)
    .input('Address',     sql.NVarChar, body.address)
    .input('District',    sql.NVarChar, body.district || null)
    .input('City',        sql.NVarChar, body.city || 'Hà Nội')
    .input('Category',    sql.NVarChar, body.category || null)
    .input('Description', sql.NVarChar(sql.MAX), body.description || null)
    .input('PriceMin',    sql.Int, body.suggestedPriceMin || null)
    .input('PriceMax',    sql.Int, body.suggestedPriceMax || null)
    .input('Lat',         sql.Float, body.latitude || null)
    .input('Lng',         sql.Float, body.longitude || null)
    .input('ImageUrl',    sql.NVarChar, imageUrl)
    .query(`
      INSERT INTO RestaurantSubmissions
        (SubmittedByUserId, Name, Address, District, City, Category,
         Description, SuggestedPriceMin, SuggestedPriceMax,
         Latitude, Longitude, ImageUrl)
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Status, INSERTED.CreatedAt
      VALUES
        (@UserId, @Name, @Address, @District, @City, @Category,
         @Description, @PriceMin, @PriceMax, @Lat, @Lng, @ImageUrl)
    `);

  return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
};

module.exports = { createSubmission };
