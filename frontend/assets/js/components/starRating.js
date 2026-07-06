const starRating = {
  // Hiển thị sao tĩnh
  renderStatic(rating, count) {
    const full = Math.round(rating);
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<span class="star ${i <= full ? 'star--filled' : ''}">★</span>`;
    }
    return `<div class="star-display">${stars}
              <span class="star-display__num">${rating ? rating.toFixed(1) : '0'}</span>
              <span class="star-display__count">(${count || 0} đánh giá)</span>
            </div>`;
  },

  // Input sao có thể click (dùng trong form gửi review)
  renderInput(containerId, initialValue = 0) {
    const container = document.getElementById(containerId);
    if (!container) return () => 0; // fallback if container not found
    
    container.innerHTML = [1,2,3,4,5].map(i =>
      `<span class="star-input__star ${i <= initialValue ? 'active' : ''}" data-value="${i}">★</span>`
    ).join('');

    let current = initialValue;
    container.dataset.selected = current; // initialize
    
    container.querySelectorAll('.star-input__star').forEach(star => {
      star.addEventListener('click', () => {
        current = parseInt(star.dataset.value);
        container.querySelectorAll('.star-input__star').forEach(s => {
          s.classList.toggle('active', parseInt(s.dataset.value) <= current);
        });
        container.dataset.selected = current;
      });
    });
    return () => parseInt(container.dataset.selected || initialValue);
  },
};
