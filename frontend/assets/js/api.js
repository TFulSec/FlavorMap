const BASE_URL = '/api';

function normalizeUnicodeDeep(value) {
  if (typeof value === 'string') return value.normalize('NFC');
  if (Array.isArray(value)) return value.map(normalizeUnicodeDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeUnicodeDeep(item)])
    );
  }
  return value;
}

const api = {
  _getHeaders(json = true) {
    const token = localStorage.getItem('accessToken');
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async _refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;

    const data = normalizeUnicodeDeep(await response.json());
    localStorage.setItem('accessToken', data.data.accessToken);
    return true;
  },

  async _fetchWithRefresh(url, options) {
    let response = await fetch(url, options);
    if (response.status !== 401) return response;

    // 401 từ đăng nhập là lỗi thông tin tài khoản, không phải access token hết hạn.
    // Nếu tự động refresh/redirect ở đây, trang đăng nhập sẽ bị tải lại trước khi
    // kịp hiển thị thông báo "Email hoặc mật khẩu không đúng".
    const isPublicAuthRequest = /\/api\/auth\/(login|register|refresh|logout)(?:[/?#]|$)/i.test(url);
    const sentAccessToken = Boolean(options.headers?.Authorization);
    if (isPublicAuthRequest || !sentAccessToken) return response;

    const refreshed = await this._refreshAccessToken();
    if (!refreshed) {
      auth.logout();

      // Chỉ chuyển hướng khi người dùng đang ở một trang được bảo vệ.
      // Giữ nguyên trang đăng nhập để thông báo lỗi có thể được hiển thị.
      if (!window.location.pathname.endsWith('/pages/login.html')) {
        const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(returnTo);
      }
      return response;
    }

    const contentType = options.headers?.['Content-Type'];
    options.headers = this._getHeaders(Boolean(contentType));
    response = await fetch(url, options);
    return response;
  },

  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: this._getHeaders(method !== 'GET' && method !== 'DELETE'),
      ...(body !== null ? { body: JSON.stringify(body) } : {}),
    };
    const response = await this._fetchWithRefresh(`${BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? normalizeUnicodeDeep(await response.json())
      : { message: (await response.text()).normalize('NFC') };

    if (!response.ok) throw new Error(data?.message || 'Có lỗi xảy ra.');
    return data;
  },

  get(endpoint) { return this.request('GET', endpoint); },
  post(endpoint, body) { return this.request('POST', endpoint, body); },
  put(endpoint, body) { return this.request('PUT', endpoint, body); },
  patch(endpoint, body) { return this.request('PATCH', endpoint, body); },
  delete(endpoint) { return this.request('DELETE', endpoint); },

  async sendFormData(method, endpoint, formData) {
    const options = {
      method,
      headers: this._getHeaders(false),
      body: formData,
    };
    const response = await this._fetchWithRefresh(`${BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? normalizeUnicodeDeep(await response.json())
      : { message: (await response.text()).normalize('NFC') };
    if (!response.ok) throw new Error(data?.message || 'Tải tệp thất bại.');
    return data;
  },

  postFormData(endpoint, formData) { return this.sendFormData('POST', endpoint, formData); },
  putFormData(endpoint, formData) { return this.sendFormData('PUT', endpoint, formData); },

  async download(endpoint, fallbackFilename) {
    const options = { method: 'GET', headers: this._getHeaders(false) };
    const response = await this._fetchWithRefresh(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? normalizeUnicodeDeep(await response.json())
        : { message: (await response.text()).normalize('NFC') };
      throw new Error(data.message || 'Không thể tải báo cáo.');
    }

    const disposition = response.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || fallbackFilename || 'download';
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};

window.api = api;
