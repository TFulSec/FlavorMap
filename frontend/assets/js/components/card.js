const card = {
  render(restaurant) {
    const temporarilyClosed = Boolean(restaurant.IsTemporarilyClosed);
    const isOpen = temporarilyClosed
      ? false
      : utils.isOpen(restaurant.OpeningTime, restaurant.ClosingTime);

    const openText = temporarilyClosed
      ? 'Tạm đóng'
      : (isOpen === null ? '' : (isOpen ? 'Đang mở' : 'Đã đóng'));
    const openClass = temporarilyClosed || isOpen === false ? 'closed' : 'open';
    const openBadge = openText
      ? `<span class="badge badge--${openClass}">${openText}</span>`
      : '';

    const featuredBadge = restaurant.IsFeatured
      ? '<span class="badge badge--featured">Nổi bật</span>'
      : '';
    const newBadge = restaurant.IsNew
      ? '<span class="badge badge--new">Mới</span>'
      : '';
    const verifiedBadge = restaurant.VerificationStatus === 'Verified'
      ? '<span class="badge badge--verified">✓ Đã xác minh</span>'
      : '';

    const crowdMap = {
      quiet: '🟢 Vắng',
      moderate: '🟡 Vừa',
      crowded: '🔴 Đông',
    };
    const crowdText = crowdMap[restaurant.CrowdStatus] || '';

    const slug = encodeURIComponent(String(restaurant.Slug || ''));
    const id = utils.escapeHtml(restaurant.Id || '');
    const name = utils.escapeHtml(restaurant.Name || 'Quán ăn địa phương');
    const address = utils.escapeHtml(restaurant.Address || 'Đang cập nhật địa chỉ');
    const category = utils.escapeHtml(utils.categoryLabel(restaurant.Category));
    const image = utils.escapeHtml(
      restaurant.BannerUrl
        || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    );
    const rating = Number(restaurant.Rating || 0);
    const distance = Number.isFinite(Number(restaurant.DistanceKm))
      ? `<span>${Number(restaurant.DistanceKm).toFixed(1)} km</span>`
      : (crowdText ? `<span>${crowdText}</span>` : '');

    return `
      <article class="restaurant-card" role="link" tabindex="0"
               onclick="window.location.href='/pages/restaurant.html?slug=${slug}'"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.location.href='/pages/restaurant.html?slug=${slug}'}">
        <div class="card__img-wrap">
          <img src="${image}"
               alt="${name}"
               class="card__img"
               loading="lazy"
               decoding="async"
               onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
          <div class="card__badges">
            ${verifiedBadge}${featuredBadge}${newBadge}${openBadge}
          </div>
          <button type="button"
                  class="bookmark-btn ${bookmarkManager.isBookmarked(restaurant.Id) ? 'bookmark-btn--active' : ''}"
                  aria-label="Lưu quán ${name}"
                  onclick="event.stopPropagation(); bookmarkManager.toggle('${slug}','${id}', this)">
            ♥
          </button>
        </div>
        <div class="card__body">
          <h3 class="card__title">${name}</h3>
          <p class="card__address">📍 ${address}</p>
          <div class="card__meta">
            <span class="card__category">${category}</span>
            <span class="card__rating">${utils.renderStars(rating)}</span>
          </div>
          <p class="card__price">
            <span>💰 ${utils.formatPriceRange(restaurant.PriceMin, restaurant.PriceMax)}</span>
            ${distance}
          </p>
        </div>
      </article>`;
  },
};
