const reviewList = {
  timeAgo(dateStr) {
    if(!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)    return 'Vừa xong';
    if (diff < 3600)  return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return `${Math.floor(diff/86400)} ngày trước`;
  },

  renderItem(review) {
    const r = review.Rating || 0;
    const stars = '★'.repeat(r) + '☆'.repeat(5 - r);
    return `
      <div class="review-item">
        <img src="${review.AvatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=FlavorMap'}"
             class="review-item__avatar" alt="${review.FullName}">
        <div class="review-item__body">
          <div class="review-item__header">
            <strong>${review.FullName}</strong>
            <span class="review-item__stars">${stars}</span>
            <span class="review-item__date">${this.timeAgo(review.CreatedAt)}</span>
          </div>
          <p class="review-item__comment">${review.Comment || ''}</p>
        </div>
      </div>`;
  },

  renderList(container, reviews) {
    if (!reviews || reviews.length === 0) {
      container.innerHTML = `<p class="empty-state-small">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>`;
      return;
    }
    container.innerHTML = reviews.map(this.renderItem.bind(this)).join('');
  },
};
