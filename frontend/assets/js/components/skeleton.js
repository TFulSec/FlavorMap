const skeleton = {
  card() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>`;
  },

  renderCards(container, count = 8) {
    container.innerHTML = Array(count).fill(this.card()).join('');
  },
};
