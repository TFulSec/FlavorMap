const sql = require('mssql');
require('dotenv').config();

const connectionString = process.env.DB_CONNECTION_STRING || null;
const dbAuth = (process.env.DB_AUTH || 'sql').toLowerCase();
const dbServer = (process.env.DB_SERVER || 'localhost').trim();

const defaultConfig = {
  server: dbServer,
  database: process.env.DB_NAME,

  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true,
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000, // ✅ sửa ở đây
  },
};

if (dbAuth === 'sql') {
  defaultConfig.user = process.env.DB_USER;
  defaultConfig.password = process.env.DB_PASSWORD;
} else if (dbAuth === 'windows') {
  defaultConfig.options.integratedSecurity = true;
  defaultConfig.options.trustedConnection = true;
}

if (!dbServer.includes('\\')) {
  const dbInstance = (process.env.DB_INSTANCE || '').trim();
  const dbPort = (process.env.DB_PORT || '').trim();

  if (dbInstance) {
    defaultConfig.options.instanceName = dbInstance;
  } else if (dbPort && !Number.isNaN(parseInt(dbPort, 10))) {
    defaultConfig.port = parseInt(dbPort, 10);
  }
}

let pool;

const getPool = async () => {
  if (!pool) {
    if (connectionString) {
      pool = await sql.connect(connectionString);
    } else {
      pool = await sql.connect(defaultConfig);
    }

    console.log('✅ Kết nối SQL Server thành công');
  }

  return pool;
};

module.exports = { getPool, sql };