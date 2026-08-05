(function () {
  'use strict';

  const reviewState = {
    status: 'Submitted',
    items: [],
    selectedId: null,
    user: null,
    initialized: false,
    loadedOnce: false,
  };

  const statusLabels = {
    Submitted: 'Chờ tiếp nhận',
    UnderReview: 'Đang kiểm tra',
    NeedsChanges: 'Cần bổ sung',
    Approved: 'Đã duyệt',
    Rejected: 'Đã từ chối',
    Draft: 'Bản nháp',
  };

  const checklistLabels = {
    ownerIdentity: 'Đã xác minh người đăng/chủ quán',
    restaurantExists: 'Quán tồn tại thực tế',
    addressMatches: 'Địa chỉ và tọa độ khớp',
    noDuplicate: 'Không trùng với quán hiện có',
    contentComplete: 'Thông tin, giá và giờ hoạt động đầy đủ',
    evidenceComplete: 'Ảnh và bằng chứng hợp lệ',
  };

  const actionLabels = {
    DraftCreated: 'Lưu nháp',
    CreatedAndSubmitted: 'Tạo và gửi hồ sơ',
    DraftUpdated: 'Cập nhật bản nháp',
    Submitted: 'Gửi xét duyệt',
    Resubmitted: 'Gửi lại hồ sơ',
    ReviewStarted: 'Bắt đầu kiểm tra',
    ChangesRequested: 'Yêu cầu bổ sung',
    Rejected: 'Từ chối',
    ApprovedAndPublished: 'Phê duyệt và xuất bản',
  };

  function getListElement() {
    return document.getElementById('applicationReviewList');
  }

  function getDetailElement() {
    return document.getElementById('applicationReviewDetail');
  }

  function emptyDetail(message = 'Chọn một hồ sơ để kiểm tra') {
    const detail = getDetailElement();
    if (!detail) return;
    detail.innerHTML = `
      <div class="application-empty-panel">
        <h3>${utils.escapeHtml(message)}</h3>
        <p>Thông tin người đăng, bằng chứng, quán nghi trùng, checklist và lịch sử xử lý sẽ hiển thị tại đây.</p>
      </div>`;
  }

  function renderList() {
    const list = getListElement();
    if (!list) return;

    if (!reviewState.items.length) {
      list.innerHTML = '<div class="application-empty-panel">Không có hồ sơ ở trạng thái này.</div>';
      return;
    }

    list.innerHTML = reviewState.items.map((item) => `
      <article class="application-review-card ${reviewState.selectedId === item.Id ? 'active' : ''}"
               data-application-id="${utils.escapeHtml(item.Id)}"
               tabindex="0"
               role="button"
               aria-label="Mở hồ sơ ${utils.escapeHtml(item.Name || '')}">
        <span class="application-status-pill application-status-${utils.escapeHtml(item.Status)}">
          ${utils.escapeHtml(statusLabels[item.Status] || item.Status)}
        </span>
        <h3 style="margin:9px 0 4px">${utils.escapeHtml(item.Name || 'Hồ sơ chưa đặt tên')}</h3>
        <p style="margin:0;color:#64748b">${utils.escapeHtml(item.Address || 'Chưa có địa chỉ')}</p>
        <small>${utils.escapeHtml(item.ApplicantName || item.OwnerEmail || 'Chưa rõ người gửi')} · ${utils.escapeHtml(item.City || '')}</small>
      </article>`).join('');

    list.querySelectorAll('[data-application-id]').forEach((card) => {
      const open = () => selectApplication(card.dataset.applicationId);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
  }

  async function loadList() {
    const list = getListElement();
    if (!list) return;

    list.innerHTML = '<p>Đang tải hồ sơ...</p>';
    reviewState.selectedId = null;
    emptyDetail();

    try {
      const response = await api.get(`/admin/restaurant-applications?status=${encodeURIComponent(reviewState.status)}`);
      reviewState.items = response.data || [];
      reviewState.loadedOnce = true;
      renderList();
    } catch (error) {
      reviewState.items = [];
      list.innerHTML = `
        <div class="application-empty-panel">
          <p>${utils.escapeHtml(error.message || 'Không thể tải hồ sơ.')}</p>
          <button type="button" class="btn btn--outline" id="retryApplicationReview">Thử lại</button>
        </div>`;
      document.getElementById('retryApplicationReview')?.addEventListener('click', loadList);
    }
  }

  function evidenceCard(label, url) {
    const safeLabel = utils.escapeHtml(label);
    if (!url) {
      return `
        <div class="application-evidence-item">
          <div style="height:120px;display:grid;place-items:center;color:#94a3b8">Chưa cung cấp</div>
          <span>${safeLabel}</span>
        </div>`;
    }

    const safeUrl = utils.escapeHtml(url);
    return `
      <div class="application-evidence-item">
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
          <img src="${safeUrl}" alt="${safeLabel}" loading="lazy">
        </a>
        <span>${safeLabel}</span>
      </div>`;
  }

  function collectChecklist() {
    return Object.fromEntries(
      Object.keys(checklistLabels).map((key) => [
        key,
        Boolean(document.getElementById(`application-check-${key}`)?.checked),
      ]),
    );
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN');
  }

  async function selectApplication(id) {
    reviewState.selectedId = id;
    renderList();

    const detail = getDetailElement();
    if (!detail) return;
    detail.innerHTML = '<p>Đang tải chi tiết hồ sơ...</p>';

    try {
      const response = await api.get(`/admin/restaurant-applications/${encodeURIComponent(id)}`);
      const item = response.data || {};
      const checklist = item.ReviewChecklist || {};
      const duplicates = item.DuplicateCandidates || [];
      const history = item.ApplicationHistory || [];
      const canReview = ['Submitted', 'UnderReview'].includes(item.Status);
      const isAdmin = reviewState.user?.role === 'Admin';

      detail.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <span class="application-status-pill application-status-${utils.escapeHtml(item.Status || '')}">
              ${utils.escapeHtml(statusLabels[item.Status] || item.Status || 'Không rõ trạng thái')}
            </span>
            <h3 style="margin:10px 0 4px">${utils.escapeHtml(item.Name || 'Hồ sơ chưa đặt tên')}</h3>
            <p style="margin:0;color:#64748b">Hồ sơ của ${utils.escapeHtml(item.ApplicantName || item.OwnerEmail || 'người dùng')}</p>
          </div>
          ${item.Status === 'Submitted' ? '<button type="button" id="applicationStartReviewBtn" class="btn btn--primary">Bắt đầu kiểm tra</button>' : ''}
        </div>

        <h3>Thông tin người đăng</h3>
        <div class="application-detail-grid">
          <div class="application-detail-row"><strong>Email tài khoản</strong>${utils.escapeHtml(item.AccountEmail || 'Chưa có')}</div>
          <div class="application-detail-row"><strong>Email liên hệ</strong>${utils.escapeHtml(item.OwnerEmail || 'Chưa có')}</div>
          <div class="application-detail-row"><strong>Số điện thoại</strong>${utils.escapeHtml(item.OwnerPhone || 'Chưa có')}</div>
          <div class="application-detail-row"><strong>Quan hệ với quán</strong>${utils.escapeHtml(item.OwnerRelationship || 'Chưa khai báo')}</div>
        </div>

        <h3>Thông tin quán</h3>
        <div class="application-detail-grid">
          <div class="application-detail-row"><strong>Địa chỉ</strong>${utils.escapeHtml(item.Address || 'Chưa có')}</div>
          <div class="application-detail-row"><strong>Khu vực</strong>${utils.escapeHtml([item.District, item.City].filter(Boolean).join(', ') || 'Chưa có')}</div>
          <div class="application-detail-row"><strong>Danh mục</strong>${utils.escapeHtml(utils.categoryLabel(item.Category))}</div>
          <div class="application-detail-row"><strong>Giá</strong>${utils.formatPrice(item.SuggestedPriceMin || 0)} – ${utils.formatPrice(item.SuggestedPriceMax || 0)}</div>
          <div class="application-detail-row"><strong>Điện thoại quán</strong>${utils.escapeHtml(item.StorePhone || 'Chưa có')}</div>
          <div class="application-detail-row"><strong>Giờ hoạt động</strong>${utils.escapeHtml(String(item.OpeningTime || '').slice(0, 5) || '--:--')} – ${utils.escapeHtml(String(item.ClosingTime || '').slice(0, 5) || '--:--')}</div>
          <div class="application-detail-row" style="grid-column:1/-1"><strong>Mô tả</strong>${utils.escapeHtml(item.Description || 'Chưa có')}</div>
        </div>

        <h3>Bằng chứng</h3>
        <div class="application-evidence-grid">
          ${evidenceCard('Ảnh mặt tiền', item.StorefrontImageUrl || item.ImageUrl)}
          ${evidenceCard('Ảnh bên trong', item.InteriorImageUrl)}
          ${evidenceCard('Menu/bảng giá', item.MenuProofUrl)}
          ${evidenceCard('Quyền quản lý', item.BusinessProofUrl)}
        </div>

        <h3>Kiểm tra trùng lặp</h3>
        ${duplicates.length
          ? `<div class="application-duplicate-box">
               <strong>Phát hiện ${duplicates.length} quán có khả năng trùng</strong>
               ${duplicates.map((duplicate) => `
                 <p>
                   <a href="/pages/restaurant.html?slug=${encodeURIComponent(duplicate.Slug || '')}" target="_blank" rel="noopener noreferrer">${utils.escapeHtml(duplicate.Name || '')}</a>
                   — ${utils.escapeHtml(duplicate.Address || '')}
                 </p>`).join('')}
             </div>`
          : '<p style="color:#047857;font-weight:800">Chưa phát hiện quán trùng theo tên, địa chỉ, điện thoại hoặc tọa độ.</p>'}

        <h3>Checklist xét duyệt</h3>
        <div class="application-checklist">
          ${Object.entries(checklistLabels).map(([key, label]) => `
            <label class="application-check-item">
              <input id="application-check-${key}" type="checkbox" ${checklist[key] ? 'checked' : ''} ${canReview ? '' : 'disabled'}>
              <span>${utils.escapeHtml(label)}</span>
            </label>`).join('')}
        </div>

        <div class="form-group" style="margin-top:16px">
          <label class="form-label" for="applicationReviewNote">Ghi chú, yêu cầu bổ sung hoặc lý do từ chối</label>
          <textarea id="applicationReviewNote" class="form-input application-note-box" ${canReview ? '' : 'disabled'}>${utils.escapeHtml(item.AdminNote || item.RejectionReason || '')}</textarea>
        </div>

        <div class="application-review-actions">
          ${canReview ? '<button type="button" id="applicationRequestChangesBtn" class="btn btn--outline">Yêu cầu bổ sung</button>' : ''}
          ${canReview ? '<button type="button" id="applicationRejectBtn" class="btn btn--outline" style="color:#b91c1c">Từ chối</button>' : ''}
          ${canReview && isAdmin ? '<button type="button" id="applicationApproveBtn" class="btn btn--primary">Phê duyệt và xuất bản</button>' : ''}
        </div>

        <h3>Lịch sử xử lý</h3>
        <div class="application-history-list">
          ${history.length
            ? history.map((entry) => `
              <div class="application-history-item">
                <small>${utils.escapeHtml(formatDate(entry.CreatedAtUtc))}</small>
                <div>
                  <strong>${utils.escapeHtml(actionLabels[entry.Action] || entry.Action || 'Cập nhật')}</strong>
                  <span>${utils.escapeHtml(entry.ActorName || entry.ActorRole || 'Hệ thống')}</span>
                  ${entry.Note ? `<p style="margin:5px 0 0">${utils.escapeHtml(entry.Note)}</p>` : ''}
                </div>
              </div>`).join('')
            : '<p>Chưa có lịch sử xử lý.</p>'}
        </div>`;

      document.getElementById('applicationStartReviewBtn')?.addEventListener('click', () => performAction('start-review'));
      document.getElementById('applicationRequestChangesBtn')?.addEventListener('click', () => performAction('request-changes'));
      document.getElementById('applicationRejectBtn')?.addEventListener('click', () => performAction('reject'));
      document.getElementById('applicationApproveBtn')?.addEventListener('click', () => performAction('approve'));
    } catch (error) {
      detail.innerHTML = `<div class="application-empty-panel">${utils.escapeHtml(error.message || 'Không thể tải chi tiết hồ sơ.')}</div>`;
    }
  }

  async function performAction(action) {
    const id = reviewState.selectedId;
    if (!id) return;

    const note = document.getElementById('applicationReviewNote')?.value.trim() || '';
    const checklist = collectChecklist();

    if (action === 'request-changes' && !note) {
      toast.error('Hãy nhập nội dung Chủ quán cần bổ sung.');
      return;
    }

    if (action === 'reject' && !note) {
      toast.error('Hãy nhập lý do từ chối hồ sơ.');
      return;
    }

    try {
      if (action === 'start-review') {
        await api.put(`/admin/restaurant-applications/${encodeURIComponent(id)}/start-review`, {});
      } else if (action === 'request-changes') {
        await api.put(`/admin/restaurant-applications/${encodeURIComponent(id)}/request-changes`, { note, checklist });
      } else if (action === 'reject') {
        await api.put(`/admin/restaurant-applications/${encodeURIComponent(id)}/reject`, { reason: note, checklist });
      } else if (action === 'approve') {
        const allChecked = Object.values(checklist).every(Boolean);
        if (!allChecked) {
          toast.error('Phải hoàn tất toàn bộ checklist trước khi phê duyệt.');
          return;
        }
        if (!window.confirm('Xác nhận hồ sơ hợp lệ, xuất bản quán và cấp quyền Chủ quán?')) return;
        await api.put(`/admin/restaurant-applications/${encodeURIComponent(id)}/approve`, { checklist });
      }

      toast.success('Đã cập nhật hồ sơ.');
      await loadList();
      if (typeof window.computeStats === 'function') {
        await window.computeStats();
      }
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật hồ sơ.');
    }
  }

  function bindTabs() {
    document.querySelectorAll('#applicationStatusTabs .application-review-tab').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('#applicationStatusTabs .application-review-tab').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        reviewState.status = button.dataset.status || 'Submitted';
        loadList();
      });
    });
  }

  function init() {
    if (reviewState.initialized) return;
    if (!document.getElementById('applications-section')) return;

    reviewState.user = auth.getUser();
    bindTabs();
    reviewState.initialized = true;
  }

  async function load() {
    init();
    reviewState.user = auth.getUser();
    await loadList();
  }

  window.adminApplications = {
    init,
    load,
    reload: loadList,
  };
})();
