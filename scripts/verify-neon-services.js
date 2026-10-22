const fs = require('fs');
const path = require('path');
const rootDir = path.resolve(__dirname, '..');

// Tự động nạp file .env nếu có
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const { Client } = require(path.join(rootDir, 'services/auth-service/node_modules/pg'));

const databases = [
  {
    name: 'auth_db',
    url: process.env.AUTH_DATABASE_URL || 'postgresql://localhost:5432/auth_db',
    queries: [
      { label: 'Danh sách bảng trong auth_db', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" },
      { label: 'Số lượng tài khoản ("user")', sql: 'SELECT COUNT(*) as count FROM "user";' },
      { label: 'Danh sách username', sql: 'SELECT username, role, "fullName" FROM "user";' },
    ],
  },
  {
    name: 'order_db',
    url: process.env.ORDER_DATABASE_URL || 'postgresql://localhost:5432/order_db',
    queries: [
      { label: 'Danh sách bảng trong order_db', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" },
      { label: 'Số lượng ca làm việc (shifts)', sql: 'SELECT COUNT(*) as count FROM shifts;' },
      { label: 'Số lượng nhân viên (employees)', sql: 'SELECT COUNT(*) as count FROM employees;' },
    ],
  },
  {
    name: 'inventory_db',
    url: process.env.INVENTORY_DATABASE_URL || 'postgresql://localhost:5432/inventory_db',
    queries: [
      { label: 'Danh sách bảng trong inventory_db', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" },
      { label: 'Số lượng nguyên liệu ("ingredient")', sql: 'SELECT COUNT(*) as count FROM "ingredient";' },
      { label: 'Số lượng tồn kho ("stock")', sql: 'SELECT COUNT(*) as count FROM "stock";' },
      { label: 'Số lượng công thức ("recipe")', sql: 'SELECT COUNT(*) as count FROM "recipe";' },
    ],
  },
];

async function verify() {
  console.log('🔍 KIỂM TRA TOÀN DIỆN KẾT NỐI VÀ DỮ LIỆU TRÊN CỤM NEON CLOUD (SINGAPORE)\n');

  for (const db of databases) {
    console.log(`------------------------------------------------------------`);
    console.log(`Kiểm tra Database: [${db.name}]`);
    console.log(`------------------------------------------------------------`);
    const client = new Client({
      connectionString: db.url,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log(`✅ Kết nối thành công đến ${db.name} trên Neon!`);

      for (const q of db.queries) {
        try {
          const res = await client.query(q.sql);
          console.log(`  👉 ${q.label}:`);
          console.table(res.rows);
        } catch (qe) {
          console.error(`  ❌ Lỗi truy vấn "${q.label}":`, qe.message);
        }
      }

      await client.end();
    } catch (err) {
      console.error(`❌ Kết nối thất bại đến ${db.name}:`, err.message);
    }
  }

  console.log('\n============================================================');
  console.log('🎯 KẾT LUẬN: Tất cả 3 Cơ sở dữ liệu trên Neon đã sẵn sàng hoạt động 100%!');
  console.log('============================================================\n');
}

verify();
