const reviewList = {
  timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  },

  renderItem(review) {
    const rating = Math.max(0, Math.min(5, Number(review.Rating || 0)));
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const avatar = utils.escapeHtml(review.AvatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=FlavorMap');
    const fullName = utils.escapeHtml(review.FullName || 'Thành viên');
    const comment = utils.escapeHtml(review.Comment || '');
    const replyOwner = utils.escapeHtml(review.ReplyOwnerName || 'Chủ quán');
    const reply = utils.escapeHtml(review.ReplyContent || '');
    const currentUser = typeof auth !== 'undefined' ? auth.getUser() : null;
    const canReport = currentUser && String(currentUser.id) !== String(review.UserId);

    return `
      <article class="review-item">
        <img src="${avatar}" class="review-item__avatar" alt="${fullName}"
             onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=FlavorMap'">
        <div class="review-item__body">
          <div class="review-item__header">
            <strong>${fullName}</strong>
            <span class="review-item__stars" aria-label="${rating} sao">${stars}</span>
            <span class="review-item__date">${this.timeAgo(review.CreatedAt)}</span>
          </div>
          <p class="review-item__comment">${comment}</p>
          ${reply ? `<div class="review-reply"><strong>Phản hồi từ ${replyOwner}</strong><p style="margin-top:5px;">${reply}</p></div>` : ''}
          ${canReport ? `<button type="button" class="review-report-btn" data-review-report="${utils.escapeHtml(String(review.Id))}">Báo cáo nội dung vi phạm</button>` : ''}
        </div>
      </article>`;
  },

  renderList(container, reviews) {
    if (!reviews || reviews.length === 0) {
      container.innerHTML = '<p class="empty-state-small">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm.</p>';
      return;
    }
    container.innerHTML = reviews.map(this.renderItem.bind(this)).join('');
  },
};
