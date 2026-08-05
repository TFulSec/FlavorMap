const crypto = require('crypto');
const { getPool, sql, getMockState } = require('../../config/db');

/**
 * Stores a user report about a missing restaurant as an internal lead.
 * A lead can never be approved into a public restaurant through this module.
 */
const createMissingRestaurantLead = async (userId, body, imageFile) => {
  const pool = await getPool();
  const imageUrl = imageFile ? `/uploads/submissions/${imageFile.filename}` : null;

  if (pool.__isMock) {
    const lead = {
      Id: crypto.randomUUID(),
      SubmittedByUserId: userId,
      SubmissionType: 'MissingRestaurantLead',
      Name: body.name,
      Address: body.address,
      District: body.district || null,
      City: body.city || 'Hà Nội',
      Category: body.category || null,
      Description: body.description || null,
      SuggestedPriceMin: body.suggestedPriceMin ?? null,
      SuggestedPriceMax: body.suggestedPriceMax ?? null,
      Latitude: body.latitude ?? null,
      Longitude: body.longitude ?? null,
      ImageUrl: imageUrl,
      Status: 'Submitted',
      CreatedAt: new Date(),
      UpdatedAtUtc: new Date(),
      SubmittedAtUtc: new Date(),
    };
    getMockState().submissions.push(lead);
    return lead;
  }

  const result = await pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('Name', sql.NVarChar(200), body.name)
    .input('Address', sql.NVarChar(300), body.address)
    .input('District', sql.NVarChar(100), body.district || null)
    .input('City', sql.NVarChar(100), body.city || 'Hà Nội')
    .input('Category', sql.NVarChar(50), body.category || null)
    .input('Description', sql.NVarChar(sql.MAX), body.description || null)
    .input('PriceMin', sql.Int, body.suggestedPriceMin ?? null)
    .input('PriceMax', sql.Int, body.suggestedPriceMax ?? null)
    .input('Lat', sql.Float, body.latitude ?? null)
    .input('Lng', sql.Float, body.longitude ?? null)
    .input('ImageUrl', sql.NVarChar(500), imageUrl)
    .query(`
      INSERT INTO dbo.RestaurantSubmissions (
        SubmittedByUserId, SubmissionType, Name, Address, District, City, Category,
        Description, SuggestedPriceMin, SuggestedPriceMax, Latitude, Longitude,
        ImageUrl, Status, UpdatedAtUtc, SubmittedAtUtc
      )
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.SubmissionType,
             INSERTED.Status, INSERTED.CreatedAt
      VALUES (
        @UserId, N'MissingRestaurantLead', @Name, @Address, @District, @City, @Category,
        @Description, @PriceMin, @PriceMax, @Lat, @Lng,
        @ImageUrl, N'Submitted', SYSUTCDATETIME(), SYSUTCDATETIME()
      );
    `);

  return result.recordset?.[0] || null;
};

module.exports = { createMissingRestaurantLead };
