process.env.FORCE_MOCK_DB = 'true';

const assert = require('assert');
const crypto = require('crypto');
const service = require('../backend/src/modules/ownerApplications/ownerApplications.service');
const legacySubmissions = require('../backend/src/modules/submissions/submissions.service');
const restaurantService = require('../backend/src/modules/restaurants/restaurants.service');
const adminService = require('../backend/src/modules/admin/admin.service');
const { getMockState } = require('../backend/src/config/db');

(async () => {
  const state = getMockState();
  const user = {
    Id: `workflow-user-${Date.now()}`,
    Email: `owner-${Date.now()}@example.com`,
    FullName: 'Workflow Owner',
    Role: 'User',
    IsBanned: false,
  };
  state.users.push(user);

  const body = {
    submissionType: 'OwnerCreate',
    name: `Quán Kiểm Thử ${Date.now()}`,
    address: '999 Đường Kiểm Thử',
    district: 'Quận Test',
    city: 'Hà Nội',
    category: 'Cơm',
    description: 'Hồ sơ kiểm thử quy trình xác minh Chủ quán.',
    suggestedPriceMin: 30000,
    suggestedPriceMax: 90000,
    latitude: 20.5,
    longitude: 104.5,
    ownerPhone: '0900000000',
    ownerEmail: user.Email,
    ownerRelationship: 'Chủ sở hữu',
    storePhone: `09${String(Date.now()).slice(-8)}`,
    openingTime: '08:00',
    closingTime: '22:00',
  };
  const fake = (name) => [{ filename: `${name}-${crypto.randomUUID()}.jpg` }];
  const files = {
    storefrontImage: fake('storefront'),
    menuProof: fake('menu'),
    businessProof: fake('proof'),
  };

  const application = await service.createApplication({ userId: user.Id, body, files, submitNow: true });
  assert.equal(application.Status, 'Submitted');
  assert.equal(application.SubmittedByUserId, user.Id);

  const mine = await service.listMine(user.Id);
  assert(mine.some((item) => item.Id === application.Id));

  await service.startReview({ id: application.Id, reviewerId: 'mock-admin-id' });
  const changes = await service.requestChanges({
    id: application.Id,
    reviewerId: 'mock-admin-id',
    note: 'Vui lòng bổ sung lại thông tin trước khi gửi duyệt.',
    checklist: {
      ownerIdentity: true,
      restaurantExists: true,
      addressMatches: false,
      noDuplicate: true,
      contentComplete: true,
      evidenceComplete: true,
    },
  });
  assert.equal(changes.Status, 'NeedsChanges');

  const updated = await service.updateApplication({
    id: application.Id,
    userId: user.Id,
    body: { ...body, address: '999 Đường Kiểm Thử, địa chỉ đã xác nhận' },
    files: {},
    submitNow: true,
  });
  assert.equal(updated.Status, 'Submitted');

  await service.startReview({ id: application.Id, reviewerId: 'mock-admin-id' });

  let incompleteRejected = false;
  try {
    await service.approveApplication({
      id: application.Id,
      reviewerId: 'mock-admin-id',
      checklist: { ownerIdentity: true },
    });
  } catch (error) {
    incompleteRejected = error.statusCode === 400;
  }
  assert(incompleteRejected, 'Approval must be blocked when checklist is incomplete.');

  const completeChecklist = {
    ownerIdentity: true,
    restaurantExists: true,
    addressMatches: true,
    noDuplicate: true,
    contentComplete: true,
    evidenceComplete: true,
  };
  const approved = await service.approveApplication({
    id: application.Id,
    reviewerId: 'mock-admin-id',
    checklist: completeChecklist,
  });

  assert.equal(approved.application.Status, 'Approved');
  assert.equal(approved.restaurant.PublicationStatus, 'Published');
  assert.equal(approved.restaurant.VerificationStatus, 'Verified');
  assert.equal(approved.restaurant.OwnerUserId, user.Id);
  assert.equal(user.Role, 'Owner');

  const reviewed = await service.getForAdmin(application.Id);
  assert(reviewed.ApplicationHistory.length >= 6, 'Application history must record workflow actions.');
  assert(reviewed.ApplicationHistory.some((entry) => entry.Action === 'ChangesRequested'));
  assert(reviewed.ApplicationHistory.some((entry) => entry.Action === 'ApprovedAndPublished'));

  const restaurantCountBeforeLead = state.restaurants.length;
  const lead = await legacySubmissions.createMissingRestaurantLead(user.Id, {
    name: 'Quán chỉ báo thiếu dữ liệu',
    address: '100 Đường Báo Tin',
    city: 'Hà Nội',
  }, null);
  assert.equal(lead.SubmissionType, 'MissingRestaurantLead');
  assert.equal(lead.Status, 'Submitted');
  assert.equal(state.restaurants.length, restaurantCountBeforeLead, 'A normal-user lead must never publish a restaurant.');
  await adminService.updateMissingRestaurantLeadStatus({
    id: lead.Id, status: 'UnderReview', note: null, reviewerId: 'mock-admin-id',
  });
  const acceptedLead = await adminService.updateMissingRestaurantLeadStatus({
    id: lead.Id, status: 'Approved', note: 'Đã xác nhận đầu mối và sẽ liên hệ Chủ quán.', reviewerId: 'mock-admin-id',
  });
  assert.equal(acceptedLead.Status, 'Approved');
  assert.equal(state.restaurants.length, restaurantCountBeforeLead, 'Accepting a lead must still never publish a restaurant.');

  state.restaurants.push({
    Id: crypto.randomUUID(), Name: 'Quán chưa duyệt', Slug: `unverified-${Date.now()}`,
    Address: 'Ẩn', City: 'Hà Nội', Category: 'Khác', Rating: 5,
    PublicationStatus: 'PendingApproval', VerificationStatus: 'UnderReview',
  });
  const publicList = await restaurantService.getRestaurants({ limit: 100, page: 1 });
  assert(!publicList.data.some((item) => item.Name === 'Quán chưa duyệt'), 'Unverified restaurants must not be public.');



  await adminService.updateRestaurantPublicationStatus({
    id: approved.restaurant.Id,
    publicationStatus: 'Suspended',
    note: 'Tạm đình chỉ để kiểm tra thông tin.',
    reviewerId: 'mock-admin-id',
  });
  const afterSuspension = await restaurantService.getRestaurants({ limit: 100, page: 1 });
  assert(!afterSuspension.data.some((item) => item.Id === approved.restaurant.Id), 'Suspended restaurants must disappear from public results.');
  await adminService.updateRestaurantPublicationStatus({
    id: approved.restaurant.Id,
    publicationStatus: 'Published',
    note: null,
    reviewerId: 'mock-admin-id',
  });

  const claimUser = {
    Id: `claim-user-${Date.now()}`,
    Email: `claim-${Date.now()}@example.com`,
    FullName: 'Claim Owner', Role: 'User', IsBanned: false,
  };
  state.users.push(claimUser);
  const claimTarget = state.restaurants.find((item) => !item.OwnerUserId && item.PublicationStatus === 'Published');
  const restaurantCountBeforeClaim = state.restaurants.length;
  const claimApplication = await service.createApplication({
    userId: claimUser.Id,
    body: {
      ...body,
      submissionType: 'OwnerClaim',
      claimedRestaurantId: claimTarget.Id,
      name: claimTarget.Name,
      address: claimTarget.Address,
      city: claimTarget.City,
      district: claimTarget.District,
      category: claimTarget.Category,
      latitude: claimTarget.Latitude,
      longitude: claimTarget.Longitude,
      ownerEmail: claimUser.Email,
      ownerPhone: '0911111111',
      storePhone: null,
    },
    files,
    submitNow: true,
  });
  let duplicateClaimBlocked = false;
  try {
    await service.createApplication({
      userId: claimUser.Id,
      body: {
        ...body,
        submissionType: 'OwnerClaim', claimedRestaurantId: claimTarget.Id,
        name: claimTarget.Name, address: claimTarget.Address, city: claimTarget.City,
        district: claimTarget.District, category: claimTarget.Category,
        ownerEmail: claimUser.Email, ownerPhone: '0911111111', storePhone: null,
      },
      files,
      submitNow: false,
    });
  } catch (error) { duplicateClaimBlocked = error.statusCode === 409; }
  assert(duplicateClaimBlocked, 'A second active ownership claim for the same user and restaurant must be blocked.');
  await service.startReview({ id: claimApplication.Id, reviewerId: 'mock-admin-id' });
  const claimed = await service.approveApplication({
    id: claimApplication.Id,
    reviewerId: 'mock-admin-id',
    checklist: completeChecklist,
  });
  assert.equal(state.restaurants.length, restaurantCountBeforeClaim, 'Ownership claim must not create a duplicate restaurant.');
  assert.equal(claimed.restaurant.Id, claimTarget.Id);
  assert.equal(claimTarget.OwnerUserId, claimUser.Id);
  assert.equal(claimUser.Role, 'Owner');

  console.log('✅ Product workflow + owner verification mock tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
