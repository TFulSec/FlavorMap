const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

async function testWrongLoginKeepsPageAndReturnsError() {
  const storage = new Map();
  let refreshCalled = false;
  let logoutCalled = false;

  const sandbox = {
    console,
    encodeURIComponent,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    fetch: async (url) => {
      if (String(url).endsWith('/api/auth/refresh')) refreshCalled = true;
      return {
        status: 401,
        ok: false,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: false, message: 'Email hoặc mật khẩu không đúng.' }),
        text: async () => '',
      };
    },
    auth: {
      logout() { logoutCalled = true; },
    },
    window: {
      location: {
        pathname: '/pages/login.html',
        search: '',
        hash: '',
        href: '/pages/login.html',
      },
    },
    URL,
    Blob,
    document: {
      createElement() { return { click() {}, remove() {} }; },
      body: { appendChild() {} },
    },
  };
  sandbox.window.window = sandbox.window;

  const source = `${read('frontend/assets/js/api.js')}\nthis.__api = api;`;
  vm.runInNewContext(source, sandbox, { filename: 'api.js' });

  let error;
  try {
    await sandbox.__api.post('/auth/login', {
      email: 'wrong@example.com',
      password: 'wrong-password',
    });
  } catch (caught) {
    error = caught;
  }

  assert(error, 'Wrong login must reject.');
  assert.equal(error.message, 'Email hoặc mật khẩu không đúng.');
  assert.equal(refreshCalled, false, 'Wrong login must not trigger token refresh.');
  assert.equal(logoutCalled, false, 'Wrong login must not clear a different session implicitly.');
  assert.equal(sandbox.window.location.href, '/pages/login.html', 'Wrong login must stay on login page.');
}

async function testAdminNavbarShowsBothPortals() {
  const placeholder = { innerHTML: '' };
  const documentMock = {
    getElementById(id) {
      return id === 'navbar-placeholder' ? placeholder : null;
    },
    addEventListener() {},
  };

  const sandbox = {
    console,
    document: documentMock,
    auth: {
      isLoggedIn: () => true,
      syncCurrentUser: async () => ({
        id: 'admin-id',
        fullName: 'Quản trị viên',
        role: 'Admin',
        avatarUrl: null,
      }),
      logout() {},
    },
    utils: {
      escapeHtml(value) { return String(value); },
    },
    window: { location: { href: '' } },
  };

  const source = `${read('frontend/assets/js/components/navbar.js')}\nthis.__navbar = navbar;`;
  vm.runInNewContext(source, sandbox, { filename: 'navbar.js' });
  await sandbox.__navbar.render();

  assert(
    placeholder.innerHTML.includes('/pages/owner.html') && placeholder.innerHTML.includes('Cổng Chủ quán'),
    'Admin navbar must show Cổng Chủ quán.'
  );
  assert(
    placeholder.innerHTML.includes('/pages/admin.html') && placeholder.innerHTML.includes('Quản trị hệ thống'),
    'Admin navbar must still show Quản trị hệ thống.'
  );
}

(async () => {
  await testWrongLoginKeepsPageAndReturnsError();
  await testAdminNavbarShowsBothPortals();
  console.log('✅ Login error and Admin navigation regression tests passed.');
})().catch((error) => {
  console.error('❌ Regression test failed:', error);
  process.exit(1);
});
