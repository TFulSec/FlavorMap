const crypto = require('crypto');
const { getPool, sql, getMockState } = require('../../config/db');
const httpError = require('../../utils/httpError');

const ALLOWED_CATEGORIES = new Set(['Cafe', 'Cơm', 'Đồ ăn vặt', 'Nước', 'Hải sản', 'Khác']);
const EDITABLE_STATUSES = new Set(['Draft', 'NeedsChanges']);
const REVIEWABLE_STATUSES = new Set(['Submitted', 'UnderReview']);
const REQUIRED_CHECKLIST_KEYS = [
  'ownerIdentity',
  'restaurantExists',
  'addressMatches',
  'noDuplicate',
  'contentComplete',
  'evidenceComplete',
];

const makeSlug = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 190);

const fileUrl = (files, fieldName) => {
  const file = files?.[fieldName]?.[0];
  return file ? `/uploads/submissions/${file.filename}` : null;
};

const normalizeApplication = (body, files = {}) => {
  const priceMin = Math.max(0, Number.parseInt(body.suggestedPriceMin || 0, 10) || 0);
  const priceMax = Math.max(priceMin, Number.parseInt(body.suggestedPriceMax || priceMin, 10) || priceMin);
  return {
    SubmissionType: body.submissionType === 'OwnerClaim' ? 'OwnerClaim' : 'OwnerCreate',
    ClaimedRestaurantId: body.submissionType === 'OwnerClaim' ? (body.claimedRestaurantId || null) : null,
    Name: String(body.name || '').trim(),
    Address: String(body.address || '').trim(),
    District: body.district ? String(body.district).trim() : null,
    City: String(body.city || 'Hà Nội').trim(),
    Category: ALLOWED_CATEGORIES.has(body.category) ? body.category : 'Khác',
    Description: body.description ? String(body.description).trim() : null,
    SuggestedPriceMin: priceMin,
    SuggestedPriceMax: priceMax,
    Latitude: body.latitude === '' || body.latitude == null ? null : Number(body.latitude),
    Longitude: body.longitude === '' || body.longitude == null ? null : Number(body.longitude),
    OwnerPhone: String(body.ownerPhone || '').trim(),
    OwnerEmail: String(body.ownerEmail || '').trim().toLowerCase(),
    OwnerRelationship: String(body.ownerRelationship || '').trim(),
    StorePhone: body.storePhone ? String(body.storePhone).trim() : null,
    WebsiteUrl: body.websiteUrl ? String(body.websiteUrl).trim() : null,
    FacebookUrl: body.facebookUrl ? String(body.facebookUrl).trim() : null,
    ZaloPhone: body.zaloPhone ? String(body.zaloPhone).trim() : null,
    OpeningTime: body.openingTime || '08:00',
    ClosingTime: body.closingTime || '22:00',
    StorefrontImageUrl: fileUrl(files, 'storefrontImage') || body.storefrontImageUrl || null,
    InteriorImageUrl: fileUrl(files, 'interiorImage') || body.interiorImageUrl || null,
    MenuProofUrl: fileUrl(files, 'menuProof') || body.menuProofUrl || null,
    BusinessProofUrl: fileUrl(files, 'businessProof') || body.businessProofUrl || null,
  };
};

const serializeChecklist = (checklist) => JSON.stringify(
  Object.fromEntries(REQUIRED_CHECKLIST_KEYS.map((key) => [key, Boolean(checklist?.[key])]))
);

const parseChecklist = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const decorateApplication = (item) => {
  if (!item) return item;
  item.ReviewChecklist = parseChecklist(item.ReviewChecklistJson);
  return item;
};

const appendMockHistory = (application, entry) => {
  application.ApplicationHistory = application.ApplicationHistory || [];
  application.ApplicationHistory.push({
    Id: crypto.randomUUID(),
    ApplicationId: application.Id,
    CreatedAtUtc: new Date(),
    ...entry,
  });
};

const addAuditLog = async (connection, {
  applicationId, actorUserId, action, fromStatus = null, toStatus = null, note = null,
}) => {
  await connection.request()
    .input('ApplicationId', sql.UniqueIdentifier, applicationId)
    .input('ActorUserId', sql.UniqueIdentifier, actorUserId || null)
    .input('Action', sql.NVarChar(50), action)
    .input('FromStatus', sql.NVarChar(20), fromStatus)
    .input('ToStatus', sql.NVarChar(20), toStatus)
    .input('Note', sql.NVarChar(2000), note ? String(note).slice(0, 2000) : null)
    .query(`
      INSERT INTO dbo.RestaurantApplicationAuditLogs
        (ApplicationId, ActorUserId, Action, FromStatus, ToStatus, Note)
      VALUES
        (@ApplicationId, @ActorUserId, @Action, @FromStatus, @ToStatus, @Note);
    `);
};

const getAuditHistory = async (applicationId) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const item = getMockState().submissions.find((entry) => String(entry.Id) === String(applicationId));
    return [...(item?.ApplicationHistory || [])].sort((a, b) => new Date(a.CreatedAtUtc) - new Date(b.CreatedAtUtc));
  }
  const result = await pool.request()
    .input('ApplicationId', sql.UniqueIdentifier, applicationId)
    .query(`
      SELECT l.Id, l.ApplicationId, l.ActorUserId, l.Action,
             l.FromStatus, l.ToStatus, l.Note, l.CreatedAtUtc,
             u.FullName AS ActorName, u.Role AS ActorRole
      FROM dbo.RestaurantApplicationAuditLogs l
      LEFT JOIN dbo.Users u ON u.Id = l.ActorUserId
      WHERE l.ApplicationId = @ApplicationId
      ORDER BY l.CreatedAtUtc ASC;
    `);
  return result.recordset || [];
};


const validateClaimTarget = async ({ pool, claimedRestaurantId, applicantUserId, excludeApplicationId = null }) => {
  if (!claimedRestaurantId) throw httpError(400, 'Vui lòng chọn quán cần yêu cầu quyền quản lý.');

  if (pool.__isMock) {
    const state = getMockState();
    const restaurant = state.restaurants.find((item) => String(item.Id) === String(claimedRestaurantId));
    if (!restaurant) throw httpError(404, 'Không tìm thấy quán cần yêu cầu quyền quản lý.');
    if (restaurant.OwnerUserId && String(restaurant.OwnerUserId) !== String(applicantUserId)) {
      throw httpError(409, 'Quán này đã được gán cho một Chủ quán khác.');
    }
    const duplicateApplication = state.submissions.find((item) =>
      item.SubmissionType === 'OwnerClaim'
      && String(item.ClaimedRestaurantId) === String(claimedRestaurantId)
      && String(item.SubmittedByUserId) === String(applicantUserId)
      && !['Rejected', 'Approved'].includes(item.Status)
      && (!excludeApplicationId || String(item.Id) !== String(excludeApplicationId))
    );
    if (duplicateApplication) throw httpError(409, 'Bạn đã có một hồ sơ nhận quyền đang được xử lý cho quán này.');
    return restaurant;
  }

  const restaurantResult = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, claimedRestaurantId)
    .query(`
      SELECT Id, Name, OwnerUserId, PublicationStatus, VerificationStatus
      FROM dbo.Restaurants
      WHERE Id = @RestaurantId;
    `);
  const restaurant = restaurantResult.recordset?.[0];
  if (!restaurant) throw httpError(404, 'Không tìm thấy quán cần yêu cầu quyền quản lý.');
  if (restaurant.OwnerUserId && String(restaurant.OwnerUserId) !== String(applicantUserId)) {
    throw httpError(409, 'Quán này đã được gán cho một Chủ quán khác.');
  }

  const request = pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, claimedRestaurantId)
    .input('UserId', sql.UniqueIdentifier, applicantUserId);
  let exclusionSql = '';
  if (excludeApplicationId) {
    request.input('ExcludeApplicationId', sql.UniqueIdentifier, excludeApplicationId);
    exclusionSql = 'AND Id <> @ExcludeApplicationId';
  }
  const duplicateResult = await request.query(`
    SELECT TOP (1) Id
    FROM dbo.RestaurantSubmissions
    WHERE SubmissionType = N'OwnerClaim'
      AND ClaimedRestaurantId = @RestaurantId
      AND SubmittedByUserId = @UserId
      AND Status NOT IN (N'Rejected', N'Approved')
      ${exclusionSql};
  `);
  if (duplicateResult.recordset?.length) {
    throw httpError(409, 'Bạn đã có một hồ sơ nhận quyền đang được xử lý cho quán này.');
  }
  return restaurant;
};

const createApplication = async ({ userId, body, files, submitNow }) => {
  const pool = await getPool();
  const data = normalizeApplication(body, files);
  if (data.SubmissionType === 'OwnerClaim') {
    await validateClaimTarget({ pool, claimedRestaurantId: data.ClaimedRestaurantId, applicantUserId: userId });
  }
  const status = submitNow ? 'Submitted' : 'Draft';

  if (pool.__isMock) {
    const application = {
      Id: crypto.randomUUID(),
      SubmittedByUserId: userId,
      ...data,
      ImageUrl: data.StorefrontImageUrl,
      Status: status,
      CreatedAt: new Date(),
      UpdatedAtUtc: new Date(),
      SubmittedAtUtc: submitNow ? new Date() : null,
    };
    appendMockHistory(application, {
      ActorUserId: userId,
      Action: submitNow ? 'CreatedAndSubmitted' : 'DraftCreated',
      FromStatus: null,
      ToStatus: status,
      Note: submitNow ? 'Chủ quán tạo và gửi hồ sơ.' : 'Chủ quán lưu hồ sơ nháp.',
    });
    getMockState().submissions.push(application);
    return decorateApplication(application);
  }

  const result = await pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('SubmissionType', sql.NVarChar(30), data.SubmissionType)
    .input('ClaimedRestaurantId', sql.UniqueIdentifier, data.ClaimedRestaurantId)
    .input('Name', sql.NVarChar(200), data.Name)
    .input('Address', sql.NVarChar(300), data.Address)
    .input('District', sql.NVarChar(100), data.District)
    .input('City', sql.NVarChar(100), data.City)
    .input('Category', sql.NVarChar(50), data.Category)
    .input('Description', sql.NVarChar(sql.MAX), data.Description)
    .input('PriceMin', sql.Int, data.SuggestedPriceMin)
    .input('PriceMax', sql.Int, data.SuggestedPriceMax)
    .input('Latitude', sql.Float, data.Latitude)
    .input('Longitude', sql.Float, data.Longitude)
    .input('ImageUrl', sql.NVarChar(500), data.StorefrontImageUrl)
    .input('Status', sql.NVarChar(20), status)
    .input('OwnerPhone', sql.NVarChar(30), data.OwnerPhone)
    .input('OwnerEmail', sql.NVarChar(200), data.OwnerEmail)
    .input('OwnerRelationship', sql.NVarChar(50), data.OwnerRelationship)
    .input('StorePhone', sql.NVarChar(30), data.StorePhone)
    .input('WebsiteUrl', sql.NVarChar(500), data.WebsiteUrl)
    .input('FacebookUrl', sql.NVarChar(500), data.FacebookUrl)
    .input('ZaloPhone', sql.NVarChar(30), data.ZaloPhone)
    .input('OpeningTime', sql.VarChar(5), data.OpeningTime)
    .input('ClosingTime', sql.VarChar(5), data.ClosingTime)
    .input('BusinessProofUrl', sql.NVarChar(500), data.BusinessProofUrl)
    .input('StorefrontImageUrl', sql.NVarChar(500), data.StorefrontImageUrl)
    .input('InteriorImageUrl', sql.NVarChar(500), data.InteriorImageUrl)
    .input('MenuProofUrl', sql.NVarChar(500), data.MenuProofUrl)
    .query(`
      INSERT INTO dbo.RestaurantSubmissions (
        SubmittedByUserId, SubmissionType, ClaimedRestaurantId, Name, Address, District, City, Category,
        Description, SuggestedPriceMin, SuggestedPriceMax, Latitude, Longitude, ImageUrl,
        Status, OwnerPhone, OwnerEmail, OwnerRelationship, StorePhone, WebsiteUrl,
        FacebookUrl, ZaloPhone, OpeningTime, ClosingTime, BusinessProofUrl,
        StorefrontImageUrl, InteriorImageUrl, MenuProofUrl, UpdatedAtUtc, SubmittedAtUtc
      )
      OUTPUT INSERTED.*
      VALUES (
        @UserId, @SubmissionType, @ClaimedRestaurantId, @Name, @Address, @District, @City, @Category,
        @Description, @PriceMin, @PriceMax, @Latitude, @Longitude, @ImageUrl,
        @Status, @OwnerPhone, @OwnerEmail, @OwnerRelationship, @StorePhone, @WebsiteUrl,
        @FacebookUrl, @ZaloPhone, @OpeningTime, @ClosingTime, @BusinessProofUrl,
        @StorefrontImageUrl, @InteriorImageUrl, @MenuProofUrl, SYSUTCDATETIME(),
        CASE WHEN @Status = N'Submitted' THEN SYSUTCDATETIME() ELSE NULL END
      );
    `);
  const created = result.recordset[0];
  await addAuditLog(pool, {
    applicationId: created.Id,
    actorUserId: userId,
    action: submitNow ? 'CreatedAndSubmitted' : 'DraftCreated',
    fromStatus: null,
    toStatus: status,
    note: submitNow ? 'Chủ quán tạo và gửi hồ sơ.' : 'Chủ quán lưu hồ sơ nháp.',
  });
  return decorateApplication(created);
};


const updateApplication = async ({ id, userId, body, files, submitNow }) => {
  const pool = await getPool();
  const existing = await getApplicationForUser({ id, userId });
  if (!EDITABLE_STATUSES.has(existing.Status)) {
    throw httpError(409, 'Chỉ hồ sơ nháp hoặc cần bổ sung mới được chỉnh sửa.');
  }

  const data = normalizeApplication(body, files);
  if (data.SubmissionType === 'OwnerClaim') {
    await validateClaimTarget({
      pool,
      claimedRestaurantId: data.ClaimedRestaurantId,
      applicantUserId: userId,
      excludeApplicationId: id,
    });
  }
  data.StorefrontImageUrl = data.StorefrontImageUrl || existing.StorefrontImageUrl || existing.ImageUrl || null;
  data.InteriorImageUrl = data.InteriorImageUrl || existing.InteriorImageUrl || null;
  data.MenuProofUrl = data.MenuProofUrl || existing.MenuProofUrl || null;
  data.BusinessProofUrl = data.BusinessProofUrl || existing.BusinessProofUrl || null;
  const nextStatus = submitNow ? 'Submitted' : existing.Status;

  if (submitNow && (!data.StorefrontImageUrl || !data.MenuProofUrl || !data.BusinessProofUrl)) {
    throw httpError(400, 'Hồ sơ gửi duyệt phải có ảnh mặt tiền, ảnh menu và bằng chứng quyền quản lý.');
  }

  if (pool.__isMock) {
    const previousStatus = existing.Status;
    Object.assign(existing, data, {
      ImageUrl: data.StorefrontImageUrl,
      Status: nextStatus,
      UpdatedAtUtc: new Date(),
      SubmittedAtUtc: submitNow ? new Date() : existing.SubmittedAtUtc,
      AdminNote: submitNow ? null : existing.AdminNote,
      RejectionReason: submitNow ? null : existing.RejectionReason,
    });
    appendMockHistory(existing, {
      ActorUserId: userId,
      Action: submitNow ? 'Resubmitted' : 'DraftUpdated',
      FromStatus: previousStatus,
      ToStatus: nextStatus,
      Note: submitNow ? 'Chủ quán cập nhật và gửi lại hồ sơ.' : 'Chủ quán cập nhật hồ sơ.',
    });
    return decorateApplication(existing);
  }

  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('SubmissionType', sql.NVarChar(30), data.SubmissionType)
    .input('ClaimedRestaurantId', sql.UniqueIdentifier, data.ClaimedRestaurantId)
    .input('Name', sql.NVarChar(200), data.Name)
    .input('Address', sql.NVarChar(300), data.Address)
    .input('District', sql.NVarChar(100), data.District)
    .input('City', sql.NVarChar(100), data.City)
    .input('Category', sql.NVarChar(50), data.Category)
    .input('Description', sql.NVarChar(sql.MAX), data.Description)
    .input('PriceMin', sql.Int, data.SuggestedPriceMin)
    .input('PriceMax', sql.Int, data.SuggestedPriceMax)
    .input('Latitude', sql.Float, data.Latitude)
    .input('Longitude', sql.Float, data.Longitude)
    .input('Status', sql.NVarChar(20), nextStatus)
    .input('OwnerPhone', sql.NVarChar(30), data.OwnerPhone)
    .input('OwnerEmail', sql.NVarChar(200), data.OwnerEmail)
    .input('OwnerRelationship', sql.NVarChar(50), data.OwnerRelationship)
    .input('StorePhone', sql.NVarChar(30), data.StorePhone)
    .input('WebsiteUrl', sql.NVarChar(500), data.WebsiteUrl)
    .input('FacebookUrl', sql.NVarChar(500), data.FacebookUrl)
    .input('ZaloPhone', sql.NVarChar(30), data.ZaloPhone)
    .input('OpeningTime', sql.VarChar(5), data.OpeningTime)
    .input('ClosingTime', sql.VarChar(5), data.ClosingTime)
    .input('BusinessProofUrl', sql.NVarChar(500), data.BusinessProofUrl)
    .input('StorefrontImageUrl', sql.NVarChar(500), data.StorefrontImageUrl)
    .input('InteriorImageUrl', sql.NVarChar(500), data.InteriorImageUrl)
    .input('MenuProofUrl', sql.NVarChar(500), data.MenuProofUrl)
    .query(`
      UPDATE dbo.RestaurantSubmissions
      SET SubmissionType = @SubmissionType, ClaimedRestaurantId = @ClaimedRestaurantId, Name = @Name, Address = @Address,
          District = @District, City = @City, Category = @Category,
          Description = @Description, SuggestedPriceMin = @PriceMin,
          SuggestedPriceMax = @PriceMax, Latitude = @Latitude, Longitude = @Longitude,
          ImageUrl = @StorefrontImageUrl, Status = @Status,
          OwnerPhone = @OwnerPhone, OwnerEmail = @OwnerEmail,
          OwnerRelationship = @OwnerRelationship, StorePhone = @StorePhone,
          WebsiteUrl = @WebsiteUrl, FacebookUrl = @FacebookUrl, ZaloPhone = @ZaloPhone,
          OpeningTime = @OpeningTime, ClosingTime = @ClosingTime,
          BusinessProofUrl = @BusinessProofUrl, StorefrontImageUrl = @StorefrontImageUrl,
          InteriorImageUrl = @InteriorImageUrl, MenuProofUrl = @MenuProofUrl,
          UpdatedAtUtc = SYSUTCDATETIME(),
          SubmittedAtUtc = CASE WHEN @Status = N'Submitted' THEN SYSUTCDATETIME() ELSE SubmittedAtUtc END,
          AdminNote = CASE WHEN @Status = N'Submitted' THEN NULL ELSE AdminNote END,
          RejectionReason = CASE WHEN @Status = N'Submitted' THEN NULL ELSE RejectionReason END
      OUTPUT INSERTED.*
      WHERE Id = @Id AND SubmittedByUserId = @UserId
        AND Status IN (N'Draft', N'NeedsChanges');
    `);
  if (!result.recordset.length) throw httpError(409, 'Hồ sơ không tồn tại hoặc không còn được chỉnh sửa.');
  await addAuditLog(pool, {
    applicationId: id,
    actorUserId: userId,
    action: submitNow ? 'Resubmitted' : 'DraftUpdated',
    fromStatus: existing.Status,
    toStatus: nextStatus,
    note: submitNow ? 'Chủ quán cập nhật và gửi lại hồ sơ.' : 'Chủ quán cập nhật hồ sơ.',
  });
  return decorateApplication(result.recordset[0]);
};

const listMine = async (userId) => {
  const pool = await getPool();
  if (pool.__isMock) {
    return getMockState().submissions
      .filter((item) => String(item.SubmittedByUserId) === String(userId) && item.SubmissionType !== 'MissingRestaurantLead')
      .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
      .map(decorateApplication);
  }
  const result = await pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .query(`
      SELECT *
      FROM dbo.RestaurantSubmissions
      WHERE SubmittedByUserId = @UserId
        AND SubmissionType IN (N'OwnerCreate', N'OwnerClaim')
      ORDER BY CreatedAt DESC;
    `);
  return (result.recordset || []).map(decorateApplication);
};

const getApplicationForUser = async ({ id, userId, privileged = false }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const item = getMockState().submissions.find((entry) => String(entry.Id) === String(id));
    if (!item || (!privileged && String(item.SubmittedByUserId) !== String(userId))) {
      throw httpError(404, 'Không tìm thấy hồ sơ đăng ký quán.');
    }
    return decorateApplication(item);
  }
  const request = pool.request().input('Id', sql.UniqueIdentifier, id);
  let ownershipSql = '';
  if (!privileged) {
    request.input('UserId', sql.UniqueIdentifier, userId);
    ownershipSql = 'AND s.SubmittedByUserId = @UserId';
  }
  const result = await request.query(`
    SELECT s.*, u.FullName AS ApplicantName, u.Email AS AccountEmail, u.Role AS ApplicantRole
    FROM dbo.RestaurantSubmissions s
    JOIN dbo.Users u ON u.Id = s.SubmittedByUserId
    WHERE s.Id = @Id ${ownershipSql};
  `);
  if (!result.recordset.length) throw httpError(404, 'Không tìm thấy hồ sơ đăng ký quán.');
  return decorateApplication(result.recordset[0]);
};

const submitApplication = async ({ id, userId }) => {
  const pool = await getPool();
  const existing = await getApplicationForUser({ id, userId });
  if (!EDITABLE_STATUSES.has(existing.Status)) {
    throw httpError(409, 'Hồ sơ không ở trạng thái có thể gửi.');
  }
  if (!existing.StorefrontImageUrl || !existing.MenuProofUrl || !existing.BusinessProofUrl) {
    throw httpError(400, 'Hồ sơ gửi duyệt phải có ảnh mặt tiền, ảnh menu và bằng chứng quyền quản lý.');
  }

  if (pool.__isMock) {
    const previousStatus = existing.Status;
    existing.Status = 'Submitted';
    existing.SubmittedAtUtc = new Date();
    existing.UpdatedAtUtc = new Date();
    existing.AdminNote = null;
    existing.RejectionReason = null;
    appendMockHistory(existing, {
      ActorUserId: userId,
      Action: 'Submitted',
      FromStatus: previousStatus,
      ToStatus: 'Submitted',
      Note: 'Chủ quán gửi hồ sơ để xét duyệt.',
    });
    return existing;
  }

  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('UserId', sql.UniqueIdentifier, userId)
    .query(`
      UPDATE dbo.RestaurantSubmissions
      SET Status = N'Submitted', SubmittedAtUtc = SYSUTCDATETIME(), UpdatedAtUtc = SYSUTCDATETIME(),
          AdminNote = NULL, RejectionReason = NULL
      OUTPUT INSERTED.*
      WHERE Id = @Id AND SubmittedByUserId = @UserId
        AND Status IN (N'Draft', N'NeedsChanges')
        AND StorefrontImageUrl IS NOT NULL
        AND MenuProofUrl IS NOT NULL
        AND BusinessProofUrl IS NOT NULL;
    `);
  if (!result.recordset.length) throw httpError(409, 'Hồ sơ không tồn tại, thiếu bằng chứng hoặc không ở trạng thái có thể gửi.');
  await addAuditLog(pool, {
    applicationId: id,
    actorUserId: userId,
    action: 'Submitted',
    fromStatus: existing.Status,
    toStatus: 'Submitted',
    note: 'Chủ quán gửi hồ sơ để xét duyệt.',
  });
  return decorateApplication(result.recordset[0]);
};

const listForAdmin = async (status) => {
  const pool = await getPool();
  if (pool.__isMock) {
    return getMockState().submissions
      .filter((item) => item.SubmissionType !== 'MissingRestaurantLead' && (!status || item.Status === status))
      .map((item) => {
        const user = getMockState().users.find((entry) => String(entry.Id) === String(item.SubmittedByUserId));
        return decorateApplication({ ...item, ApplicantName: user?.FullName, AccountEmail: user?.Email });
      });
  }
  const request = pool.request();
  let where = `WHERE s.SubmissionType IN (N'OwnerCreate', N'OwnerClaim')`;
  if (status) {
    request.input('Status', sql.NVarChar(20), status);
    where += ' AND s.Status = @Status';
  }
  const result = await request.query(`
    SELECT s.*, u.FullName AS ApplicantName, u.Email AS AccountEmail, u.Role AS ApplicantRole
    FROM dbo.RestaurantSubmissions s
    JOIN dbo.Users u ON u.Id = s.SubmittedByUserId
    ${where}
    ORDER BY COALESCE(s.SubmittedAtUtc, s.CreatedAt) DESC;
  `);
  return (result.recordset || []).map(decorateApplication);
};

const findDuplicates = async (application) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const normalizedName = String(application.Name || '').toLowerCase();
    return getMockState().restaurants.filter((restaurant) => {
      if (application.ClaimedRestaurantId && String(restaurant.Id) === String(application.ClaimedRestaurantId)) return false;
      const samePhone = application.StorePhone && restaurant.Phone && application.StorePhone === restaurant.Phone;
      const sameNameAddress = restaurant.Name?.toLowerCase() === normalizedName
        && restaurant.Address?.toLowerCase() === String(application.Address || '').toLowerCase();
      const closeCoordinates = application.Latitude != null && application.Longitude != null
        && restaurant.Latitude != null && restaurant.Longitude != null
        && Math.abs(Number(application.Latitude) - Number(restaurant.Latitude)) <= 0.0015
        && Math.abs(Number(application.Longitude) - Number(restaurant.Longitude)) <= 0.0015;
      return samePhone || sameNameAddress || closeCoordinates;
    });
  }

  const result = await pool.request()
    .input('ClaimedRestaurantId', sql.UniqueIdentifier, application.ClaimedRestaurantId || null)
    .input('Name', sql.NVarChar(200), application.Name)
    .input('Address', sql.NVarChar(300), application.Address)
    .input('StorePhone', sql.NVarChar(30), application.StorePhone || null)
    .input('Latitude', sql.Float, application.Latitude)
    .input('Longitude', sql.Float, application.Longitude)
    .query(`
      SELECT TOP (10) Id, Name, Slug, Address, City, District, Phone,
             Latitude, Longitude, PublicationStatus, VerificationStatus
      FROM dbo.Restaurants
      WHERE (@ClaimedRestaurantId IS NULL OR Id <> @ClaimedRestaurantId)
        AND ((@StorePhone IS NOT NULL AND Phone = @StorePhone)
         OR (LOWER(Name) = LOWER(@Name) AND LOWER(Address) = LOWER(@Address))
         OR (@Latitude IS NOT NULL AND @Longitude IS NOT NULL
             AND Latitude IS NOT NULL AND Longitude IS NOT NULL
             AND ABS(Latitude - @Latitude) <= 0.0015
             AND ABS(Longitude - @Longitude) <= 0.0015))
      ORDER BY Name;
    `);
  return result.recordset || [];
};

const getForAdmin = async (id) => {
  const application = await getApplicationForUser({ id, privileged: true });
  return {
    ...application,
    DuplicateCandidates: await findDuplicates(application),
    ApplicationHistory: await getAuditHistory(id),
  };
};

const startReview = async ({ id, reviewerId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const item = await getApplicationForUser({ id, privileged: true });
    if (item.Status !== 'Submitted') throw httpError(409, 'Chỉ hồ sơ đã gửi mới được bắt đầu kiểm tra.');
    const previousStatus = item.Status;
    item.Status = 'UnderReview';
    item.ProcessedByUserId = reviewerId;
    item.ReviewStartedAtUtc = new Date();
    appendMockHistory(item, {
      ActorUserId: reviewerId, Action: 'ReviewStarted',
      FromStatus: previousStatus, ToStatus: 'UnderReview', Note: 'Bắt đầu kiểm tra hồ sơ.',
    });
    return item;
  }
  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
    .query(`
      UPDATE dbo.RestaurantSubmissions
      SET Status = N'UnderReview', ReviewStartedAtUtc = SYSUTCDATETIME(),
          ProcessedByUserId = @ReviewerId, UpdatedAtUtc = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE Id = @Id AND Status = N'Submitted';
    `);
  if (!result.recordset.length) throw httpError(409, 'Chỉ hồ sơ đã gửi mới được bắt đầu kiểm tra.');
  await addAuditLog(pool, {
    applicationId: id, actorUserId: reviewerId, action: 'ReviewStarted',
    fromStatus: 'Submitted', toStatus: 'UnderReview', note: 'Bắt đầu kiểm tra hồ sơ.',
  });
  return decorateApplication(result.recordset[0]);
};

const requestChanges = async ({ id, reviewerId, note, checklist }) => {
  if (!String(note || '').trim()) throw httpError(400, 'Phải nêu rõ nội dung Chủ quán cần bổ sung.');
  const pool = await getPool();
  const checklistJson = serializeChecklist(checklist);
  if (pool.__isMock) {
    const item = await getApplicationForUser({ id, privileged: true });
    if (!REVIEWABLE_STATUSES.has(item.Status)) throw httpError(409, 'Hồ sơ không ở trạng thái có thể yêu cầu bổ sung.');
    const previousStatus = item.Status;
    Object.assign(item, {
      Status: 'NeedsChanges', AdminNote: note.trim(), ReviewChecklistJson: checklistJson,
      ReviewChecklist: parseChecklist(checklistJson), ProcessedByUserId: reviewerId, UpdatedAtUtc: new Date(),
    });
    appendMockHistory(item, {
      ActorUserId: reviewerId, Action: 'ChangesRequested',
      FromStatus: previousStatus, ToStatus: 'NeedsChanges', Note: note.trim(),
    });
    return item;
  }
  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
    .input('AdminNote', sql.NVarChar(sql.MAX), note.trim())
    .input('Checklist', sql.NVarChar(sql.MAX), checklistJson)
    .query(`
      UPDATE dbo.RestaurantSubmissions
      SET Status = N'NeedsChanges', AdminNote = @AdminNote,
          ReviewChecklistJson = @Checklist, ProcessedByUserId = @ReviewerId,
          UpdatedAtUtc = SYSUTCDATETIME()
      OUTPUT DELETED.Status AS PreviousStatus, INSERTED.*
      WHERE Id = @Id AND Status IN (N'Submitted', N'UnderReview');
    `);
  if (!result.recordset.length) throw httpError(409, 'Hồ sơ không ở trạng thái có thể yêu cầu bổ sung.');
  await addAuditLog(pool, {
    applicationId: id, actorUserId: reviewerId, action: 'ChangesRequested',
    fromStatus: result.recordset[0].PreviousStatus, toStatus: 'NeedsChanges', note: note.trim(),
  });
  return decorateApplication(result.recordset[0]);
};

const rejectApplication = async ({ id, reviewerId, reason, checklist }) => {
  if (!String(reason || '').trim()) throw httpError(400, 'Từ chối hồ sơ bắt buộc phải có lý do.');
  const pool = await getPool();
  const checklistJson = serializeChecklist(checklist);
  if (pool.__isMock) {
    const item = await getApplicationForUser({ id, privileged: true });
    if (!REVIEWABLE_STATUSES.has(item.Status)) throw httpError(409, 'Hồ sơ không ở trạng thái có thể từ chối.');
    const previousStatus = item.Status;
    Object.assign(item, {
      Status: 'Rejected', RejectionReason: reason.trim(), ReviewChecklistJson: checklistJson,
      ReviewChecklist: parseChecklist(checklistJson), ProcessedByUserId: reviewerId,
      ProcessedAtUtc: new Date(), UpdatedAtUtc: new Date(),
    });
    appendMockHistory(item, {
      ActorUserId: reviewerId, Action: 'Rejected',
      FromStatus: previousStatus, ToStatus: 'Rejected', Note: reason.trim(),
    });
    return item;
  }
  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
    .input('Reason', sql.NVarChar(500), reason.trim())
    .input('Checklist', sql.NVarChar(sql.MAX), checklistJson)
    .query(`
      UPDATE dbo.RestaurantSubmissions
      SET Status = N'Rejected', RejectionReason = @Reason,
          ReviewChecklistJson = @Checklist, ProcessedByUserId = @ReviewerId,
          ProcessedAtUtc = SYSUTCDATETIME(), UpdatedAtUtc = SYSUTCDATETIME()
      OUTPUT DELETED.Status AS PreviousStatus, INSERTED.*
      WHERE Id = @Id AND Status IN (N'Submitted', N'UnderReview');
    `);
  if (!result.recordset.length) throw httpError(409, 'Hồ sơ không ở trạng thái có thể từ chối.');
  await addAuditLog(pool, {
    applicationId: id, actorUserId: reviewerId, action: 'Rejected',
    fromStatus: result.recordset[0].PreviousStatus, toStatus: 'Rejected', note: reason.trim(),
  });
  return decorateApplication(result.recordset[0]);
};

const approveApplication = async ({ id, reviewerId, checklist }) => {
  const normalizedChecklist = Object.fromEntries(
    REQUIRED_CHECKLIST_KEYS.map((key) => [key, Boolean(checklist?.[key])])
  );
  const missing = REQUIRED_CHECKLIST_KEYS.filter((key) => !normalizedChecklist[key]);
  if (missing.length) throw httpError(400, `Không thể duyệt khi checklist chưa hoàn tất: ${missing.join(', ')}.`);

  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const item = await getApplicationForUser({ id, privileged: true });
    if (!REVIEWABLE_STATUSES.has(item.Status)) throw httpError(409, 'Hồ sơ không ở trạng thái có thể phê duyệt.');

    if (item.SubmissionType === 'OwnerClaim') {
      const restaurant = state.restaurants.find((entry) => String(entry.Id) === String(item.ClaimedRestaurantId));
      if (!restaurant) throw httpError(404, 'Không tìm thấy quán cần nhận quyền quản lý.');
      if (restaurant.OwnerUserId && String(restaurant.OwnerUserId) !== String(item.SubmittedByUserId)) {
        throw httpError(409, 'Quán này đã được gán cho một Chủ quán khác.');
      }
      const applicant = state.users.find((entry) => String(entry.Id) === String(item.SubmittedByUserId));
      if (applicant?.Role === 'User') applicant.Role = 'Owner';
      Object.assign(restaurant, {
        OwnerUserId: item.SubmittedByUserId,
        PublicationStatus: 'Published', VerificationStatus: 'Verified',
        VerifiedAtUtc: new Date(), LastVerifiedAtUtc: new Date(),
        VerifiedByUserId: reviewerId, SourceType: 'OwnerClaim',
      });
      const previousStatus = item.Status;
      Object.assign(item, {
        Status: 'Approved', ApprovedRestaurantId: restaurant.Id, ProcessedByUserId: reviewerId,
        ProcessedAtUtc: new Date(), UpdatedAtUtc: new Date(),
        ReviewChecklistJson: serializeChecklist(normalizedChecklist), ReviewChecklist: normalizedChecklist,
      });
      appendMockHistory(item, {
        ActorUserId: reviewerId, Action: 'OwnershipClaimApproved',
        FromStatus: previousStatus, ToStatus: 'Approved',
        Note: `Đã xác minh và cấp quyền quản lý quán ${restaurant.Name}.`,
      });
      return { application: item, restaurant };
    }

    const duplicates = await findDuplicates(item);
    if (duplicates.length) throw httpError(409, 'Phát hiện quán có khả năng trùng. Hãy xử lý trùng lặp trước khi duyệt.');
    const applicant = state.users.find((entry) => String(entry.Id) === String(item.SubmittedByUserId));
    if (applicant?.Role === 'User') applicant.Role = 'Owner';
    const restaurant = {
      Id: crypto.randomUUID(), Name: item.Name, Slug: makeSlug(item.Name) || `restaurant-${Date.now()}`,
      Description: item.Description, Address: item.Address, City: item.City || 'Hà Nội', District: item.District,
      Latitude: item.Latitude, Longitude: item.Longitude, Category: item.Category || 'Khác',
      PriceMin: item.SuggestedPriceMin || 0, PriceMax: item.SuggestedPriceMax || 0,
      OpeningTime: item.OpeningTime || '08:00', ClosingTime: item.ClosingTime || '22:00',
      BannerUrl: item.StorefrontImageUrl || item.ImageUrl, Phone: item.StorePhone,
      WebsiteUrl: item.WebsiteUrl, FacebookUrl: item.FacebookUrl, ZaloPhone: item.ZaloPhone,
      OwnerUserId: item.SubmittedByUserId, Rating: 0, IsFeatured: false, IsNew: true,
      PublicationStatus: 'Published', VerificationStatus: 'Verified',
      VerifiedAtUtc: new Date(), LastVerifiedAtUtc: new Date(), VerifiedByUserId: reviewerId,
      SourceType: 'OwnerApplication', CreatedAt: new Date(),
    };
    state.restaurants.push(restaurant);
    const previousStatus = item.Status;
    Object.assign(item, {
      Status: 'Approved', ApprovedRestaurantId: restaurant.Id, ProcessedByUserId: reviewerId,
      ProcessedAtUtc: new Date(), UpdatedAtUtc: new Date(),
      ReviewChecklistJson: serializeChecklist(normalizedChecklist), ReviewChecklist: normalizedChecklist,
    });
    appendMockHistory(item, {
      ActorUserId: reviewerId, Action: 'ApprovedAndPublished',
      FromStatus: previousStatus, ToStatus: 'Approved',
      Note: `Đã xác minh và xuất bản quán ${restaurant.Name}.`,
    });
    return { application: item, restaurant };
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const appResult = await transaction.request()
      .input('Id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM dbo.RestaurantSubmissions WITH (UPDLOCK, HOLDLOCK) WHERE Id = @Id;`);
    const application = appResult.recordset?.[0];
    if (!application) throw httpError(404, 'Không tìm thấy hồ sơ.');
    if (!REVIEWABLE_STATUSES.has(application.Status)) throw httpError(409, 'Hồ sơ không ở trạng thái có thể phê duyệt.');

    if (application.SubmissionType === 'OwnerClaim') {
      if (!application.ClaimedRestaurantId) throw httpError(400, 'Hồ sơ nhận quyền không có quán đích.');
      const claimResult = await transaction.request()
        .input('RestaurantId', sql.UniqueIdentifier, application.ClaimedRestaurantId)
        .input('OwnerUserId', sql.UniqueIdentifier, application.SubmittedByUserId)
        .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
        .query(`
          UPDATE dbo.Restaurants WITH (UPDLOCK, HOLDLOCK)
          SET OwnerUserId = @OwnerUserId,
              PublicationStatus = N'Published', VerificationStatus = N'Verified',
              VerifiedAtUtc = COALESCE(VerifiedAtUtc, SYSUTCDATETIME()),
              LastVerifiedAtUtc = SYSUTCDATETIME(), VerifiedByUserId = @ReviewerId,
              SourceType = N'OwnerClaim'
          OUTPUT INSERTED.*
          WHERE Id = @RestaurantId
            AND (OwnerUserId IS NULL OR OwnerUserId = @OwnerUserId);
        `);
      if (!claimResult.recordset.length) {
        throw httpError(409, 'Quán không tồn tại hoặc đã thuộc quyền quản lý của Chủ quán khác.');
      }
      const claimedRestaurant = claimResult.recordset[0];

      await transaction.request()
        .input('UserId', sql.UniqueIdentifier, application.SubmittedByUserId)
        .query(`UPDATE dbo.Users SET Role = CASE WHEN Role = N'User' THEN N'Owner' ELSE Role END, UpdatedAt = SYSUTCDATETIME() WHERE Id = @UserId;`);

      await transaction.request()
        .input('Id', sql.UniqueIdentifier, id)
        .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
        .input('RestaurantId', sql.UniqueIdentifier, claimedRestaurant.Id)
        .input('Checklist', sql.NVarChar(sql.MAX), serializeChecklist(normalizedChecklist))
        .query(`
          UPDATE dbo.RestaurantSubmissions
          SET Status = N'Approved', ApprovedRestaurantId = @RestaurantId,
              ProcessedByUserId = @ReviewerId, ProcessedAtUtc = SYSUTCDATETIME(),
              UpdatedAtUtc = SYSUTCDATETIME(), ReviewChecklistJson = @Checklist,
              AdminNote = NULL, RejectionReason = NULL
          WHERE Id = @Id;
        `);

      await addAuditLog(transaction, {
        applicationId: id, actorUserId: reviewerId, action: 'OwnershipClaimApproved',
        fromStatus: application.Status, toStatus: 'Approved',
        note: `Đã xác minh và cấp quyền quản lý quán ${claimedRestaurant.Name}.`,
      });
      await transaction.commit();
      return {
        application: { Id: id, Status: 'Approved', ApprovedRestaurantId: claimedRestaurant.Id },
        restaurant: claimedRestaurant,
      };
    }

    const duplicateResult = await transaction.request()
      .input('Name', sql.NVarChar(200), application.Name)
      .input('Address', sql.NVarChar(300), application.Address)
      .input('StorePhone', sql.NVarChar(30), application.StorePhone || null)
      .input('Latitude', sql.Float, application.Latitude)
      .input('Longitude', sql.Float, application.Longitude)
      .query(`
        SELECT TOP (1) Id, Name
        FROM dbo.Restaurants WITH (UPDLOCK, HOLDLOCK)
        WHERE (@StorePhone IS NOT NULL AND Phone = @StorePhone)
           OR (LOWER(Name) = LOWER(@Name) AND LOWER(Address) = LOWER(@Address))
           OR (@Latitude IS NOT NULL AND @Longitude IS NOT NULL
               AND Latitude IS NOT NULL AND Longitude IS NOT NULL
               AND ABS(Latitude - @Latitude) <= 0.0015
               AND ABS(Longitude - @Longitude) <= 0.0015);
      `);
    if (duplicateResult.recordset.length) {
      throw httpError(409, `Hồ sơ có khả năng trùng với quán “${duplicateResult.recordset[0].Name}”.`);
    }

    const baseSlug = makeSlug(application.Name) || `restaurant-${String(id).slice(0, 8)}`;
    let slug = baseSlug;
    const slugResult = await transaction.request()
      .input('Slug', sql.NVarChar(220), slug)
      .query('SELECT Id FROM dbo.Restaurants WHERE Slug = @Slug;');
    if (slugResult.recordset.length) slug = `${baseSlug}-${String(id).slice(0, 8)}`;

    const priceMin = Math.max(0, Number(application.SuggestedPriceMin || 0));
    const priceMax = Math.max(priceMin, Number(application.SuggestedPriceMax || priceMin));
    const restaurantResult = await transaction.request()
      .input('Name', sql.NVarChar(200), application.Name)
      .input('Slug', sql.NVarChar(220), slug)
      .input('Description', sql.NVarChar(sql.MAX), application.Description || null)
      .input('Address', sql.NVarChar(300), application.Address)
      .input('City', sql.NVarChar(100), application.City || 'Hà Nội')
      .input('District', sql.NVarChar(100), application.District || null)
      .input('Latitude', sql.Float, application.Latitude)
      .input('Longitude', sql.Float, application.Longitude)
      .input('Category', sql.NVarChar(50), ALLOWED_CATEGORIES.has(application.Category) ? application.Category : 'Khác')
      .input('PriceMin', sql.Int, priceMin)
      .input('PriceMax', sql.Int, priceMax)
      .input('OpeningTime', sql.VarChar(5), application.OpeningTime || '08:00')
      .input('ClosingTime', sql.VarChar(5), application.ClosingTime || '22:00')
      .input('BannerUrl', sql.NVarChar(500), application.StorefrontImageUrl || application.ImageUrl || null)
      .input('Phone', sql.NVarChar(30), application.StorePhone || null)
      .input('WebsiteUrl', sql.NVarChar(500), application.WebsiteUrl || null)
      .input('FacebookUrl', sql.NVarChar(500), application.FacebookUrl || null)
      .input('ZaloPhone', sql.NVarChar(30), application.ZaloPhone || null)
      .input('OwnerUserId', sql.UniqueIdentifier, application.SubmittedByUserId)
      .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
      .query(`
        INSERT INTO dbo.Restaurants (
          Name, Slug, Description, Address, City, District, Latitude, Longitude,
          Category, PriceMin, PriceMax, OpeningTime, ClosingTime, BannerUrl,
          Phone, WebsiteUrl, FacebookUrl, ZaloPhone, OwnerUserId,
          IsFeatured, IsNew, Rating, PublicationStatus, VerificationStatus,
          VerifiedAtUtc, LastVerifiedAtUtc, VerifiedByUserId, SourceType
        )
        OUTPUT INSERTED.*
        VALUES (
          @Name, @Slug, @Description, @Address, @City, @District, @Latitude, @Longitude,
          @Category, @PriceMin, @PriceMax, @OpeningTime, @ClosingTime, @BannerUrl,
          @Phone, @WebsiteUrl, @FacebookUrl, @ZaloPhone, @OwnerUserId,
          0, 1, 0, N'Published', N'Verified',
          SYSUTCDATETIME(), SYSUTCDATETIME(), @ReviewerId, N'OwnerApplication'
        );
      `);
    const restaurant = restaurantResult.recordset[0];

    await transaction.request()
      .input('UserId', sql.UniqueIdentifier, application.SubmittedByUserId)
      .query(`UPDATE dbo.Users SET Role = CASE WHEN Role = N'User' THEN N'Owner' ELSE Role END, UpdatedAt = SYSUTCDATETIME() WHERE Id = @UserId;`);

    await transaction.request()
      .input('Id', sql.UniqueIdentifier, id)
      .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
      .input('RestaurantId', sql.UniqueIdentifier, restaurant.Id)
      .input('Checklist', sql.NVarChar(sql.MAX), serializeChecklist(normalizedChecklist))
      .query(`
        UPDATE dbo.RestaurantSubmissions
        SET Status = N'Approved', ApprovedRestaurantId = @RestaurantId,
            ProcessedByUserId = @ReviewerId, ProcessedAtUtc = SYSUTCDATETIME(),
            UpdatedAtUtc = SYSUTCDATETIME(), ReviewChecklistJson = @Checklist,
            AdminNote = NULL, RejectionReason = NULL
        WHERE Id = @Id;
      `);

    await addAuditLog(transaction, {
      applicationId: id,
      actorUserId: reviewerId,
      action: 'ApprovedAndPublished',
      fromStatus: application.Status,
      toStatus: 'Approved',
      note: `Đã xác minh và xuất bản quán ${restaurant.Name}.`,
    });

    await transaction.commit();
    return { application: { Id: id, Status: 'Approved', ApprovedRestaurantId: restaurant.Id }, restaurant };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* ignore */ }
    throw error;
  }
};

module.exports = {
  REQUIRED_CHECKLIST_KEYS,
  createApplication,
  updateApplication,
  listMine,
  getApplicationForUser,
  submitApplication,
  listForAdmin,
  getForAdmin,
  startReview,
  requestChanges,
  rejectApplication,
  approveApplication,
};
