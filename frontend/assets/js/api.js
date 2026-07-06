const BASE_URL = '/api';

const api = {
  // Gắn token tự động
  _getHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  async request(method, endpoint, body = null) {
    const headers = this._getHeaders();
    if (method === 'GET') {
      delete headers['Content-Type'];
    }
    const options = {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    };

    let res = await fetch(`${BASE_URL}${endpoint}`, options);

    // Auto-refresh token nếu 401
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          localStorage.setItem('accessToken', refreshData.data.accessToken);
          // Gửi lại request gốc
          const newHeaders = this._getHeaders();
          if (method === 'GET') delete newHeaders['Content-Type'];
          options.headers = newHeaders;
          res = await fetch(`${BASE_URL}${endpoint}`, options);
        } else {
          // Refresh cũng lỗi → logout
          auth.logout();
          window.location.href = '/pages/login.html';
          return;
        }
      }
    }

    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Non-JSON response (${res.status} - ${contentType}): ${text.substring(0, 50)}`);
    }
    
    if (!res.ok) throw new Error(data?.message || 'Có lỗi xảy ra.');
    return data;
  },

  get(endpoint)           { return this.request('GET',    endpoint); },
  post(endpoint, body)    { return this.request('POST',   endpoint, body); },
  put(endpoint, body)     { return this.request('PUT',    endpoint, body); },
  delete(endpoint)        { return this.request('DELETE', endpoint); },

  async postFormData(endpoint, formData) {
  let token = localStorage.getItem('accessToken');

  let res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
    body: formData
  });

  // AUTO REFRESH TOKEN
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();

        localStorage.setItem(
          'accessToken',
          refreshData.data.accessToken
        );

        token = refreshData.data.accessToken;

        res = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      } else {
        auth.logout();
        window.location.href = '/pages/login.html';
        return;
      }
    }
  }

  let data;

  const contentType = res.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();

    throw new Error(
      `Non-JSON response (${res.status}): ${text.substring(0, 100)}`
    );
  }

  if (!res.ok) {
    throw new Error(data?.message || 'Có lỗi xảy ra.');
  }

  return data;
}
};

window.api = api;