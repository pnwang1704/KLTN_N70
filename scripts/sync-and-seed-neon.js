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

const { DataSource } = require(path.join(rootDir, 'services/auth-service/node_modules/typeorm'));
const bcrypt = require(path.join(rootDir, 'services/auth-service/node_modules/bcrypt'));

// Các đường dẫn kết nối lấy từ biến môi trường
const NEON_CONFIG = {
  auth: {
    name: 'auth_db',
    url: process.env.AUTH_DATABASE_URL || 'postgresql://localhost:5432/auth_db',
    entities: [path.join(rootDir, 'services/auth-service/dist/auth/entities/user.entity.js')],
  },
  order: {
    name: 'order_db',
    url: process.env.ORDER_DATABASE_URL || 'postgresql://localhost:5432/order_db',
    entities: [
      path.join(rootDir, 'services/order-service/dist/order/entities/order.entity.js'),
      path.join(rootDir, 'services/order-service/dist/order/entities/order-item.entity.js'),
      path.join(rootDir, 'services/order-service/dist/order/entities/order-item-topping.entity.js'),
      path.join(rootDir, 'services/order-service/dist/order/entities/payment.entity.js'),
      path.join(rootDir, 'services/order-service/dist/order/entities/expense.entity.js'),
      path.join(rootDir, 'services/order-service/dist/shift/entities/shift.entity.js'),
      path.join(rootDir, 'services/order-service/dist/employee/entities/employee.entity.js'),
      path.join(rootDir, 'services/order-service/dist/attendance/entities/attendance.entity.js'),
    ],
  },
  inventory: {
    name: 'inventory_db',
    url: process.env.INVENTORY_DATABASE_URL || 'postgresql://localhost:5432/inventory_db',
    entities: [
      path.join(rootDir, 'services/inventory-service/dist/inventory/entities/ingredient.entity.js'),
      path.join(rootDir, 'services/inventory-service/dist/inventory/entities/recipe.entity.js'),
      path.join(rootDir, 'services/inventory-service/dist/inventory/entities/recipe-item.entity.js'),
      path.join(rootDir, 'services/inventory-service/dist/inventory/entities/stock.entity.js'),
    ],
  },
};

async function syncAndSeedAuth() {
  console.log('\n======================================================');
  console.log('1. [AUTH_DB] Kết nối và Đồng bộ Schema lên Neon Cloud');
  console.log('======================================================');
  const ds = new DataSource({
    type: 'postgres',
    url: NEON_CONFIG.auth.url,
    entities: NEON_CONFIG.auth.entities,
    synchronize: true,
    ssl: { rejectUnauthorized: false },
    extra: { ssl: { rejectUnauthorized: false } },
  });

  await ds.initialize();
  console.log('✅ [AUTH_DB] Kết nối Neon thành công & Schema đã được đồng bộ!');

  const userRepo = ds.getRepository('User');
  const userCount = await userRepo.count();
  console.log(`[AUTH_DB] Số lượng user hiện có trong Neon: ${userCount}`);

  if (userCount === 0) {
    console.log('[AUTH_DB] Bắt đầu seed các tài khoản mẫu...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedCashierPassword = await bcrypt.hash('123456', 10);
    const hashedManagerPassword = await bcrypt.hash('123456', 10);
    const hashedKitchenPassword = await bcrypt.hash('123456', 10);

    await userRepo.save([
      {
        username: 'admin',
        password: hashedAdminPassword,
        fullName: 'Quản trị viên Hệ thống',
        role: 'ADMIN',
        branchId: '1',
        isActive: true,
      },
      {
        username: 'thungancn1',
        password: hashedCashierPassword,
        fullName: 'Thu ngân Chi nhánh 1',
        role: 'CASHIER',
        branchId: '1',
        isActive: true,
      },
      {
        username: 'quanlycn1',
        password: hashedManagerPassword,
        fullName: 'Quản lý Chi nhánh 1',
        role: 'MANAGER',
        branchId: '1',
        isActive: true,
      },
      {
        username: 'bepcn1',
        password: hashedKitchenPassword,
        fullName: 'Bếp Trưởng Chi nhánh 1',
        role: 'KITCHEN',
        branchId: '1',
        isActive: true,
      },
    ]);
    console.log('✅ [AUTH_DB] Đã seed 4 tài khoản mẫu: admin, thungancn1, quanlycn1, bepcn1.');
  } else {
    console.log('ℹ️ [AUTH_DB] Đã có dữ liệu tài khoản, bỏ qua seed mặc định.');
  }

  const allUsers = await userRepo.find();
  console.log('📋 Danh sách User trên Neon auth_db:');
  console.table(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role, fullName: u.fullName, branchId: u.branchId, isActive: u.isActive })));

  await ds.destroy();
}

async function syncAndSeedOrder() {
  console.log('\n======================================================');
  console.log('2. [ORDER_DB] Kết nối và Đồng bộ Schema lên Neon Cloud');
  console.log('======================================================');
  const ds = new DataSource({
    type: 'postgres',
    url: NEON_CONFIG.order.url,
    entities: NEON_CONFIG.order.entities,
    synchronize: true,
    ssl: { rejectUnauthorized: false },
    extra: { ssl: { rejectUnauthorized: false } },
  });

  await ds.initialize();
  console.log('✅ [ORDER_DB] Kết nối Neon thành công & Schema đã được đồng bộ!');

  // 1. Seed Shifts
  const shiftRepo = ds.getRepository('Shift');
  const shiftCount = await shiftRepo.count();
  console.log(`[ORDER_DB] Số lượng ca làm việc hiện có: ${shiftCount}`);
  if (shiftCount === 0) {
    console.log('[ORDER_DB] Bắt đầu seed ca làm việc mặc định...');
    await shiftRepo.save([
      {
        code: 'CA_1',
        name: 'Ca 1 (06:00 - 14:00)',
        startTime: '06:00',
        endTime: '14:00',
        gracePeriodMinutes: 15,
        isActive: true,
      },
      {
        code: 'CA_2',
        name: 'Ca 2 (14:00 - 22:00)',
        startTime: '14:00',
        endTime: '22:00',
        gracePeriodMinutes: 15,
        isActive: true,
      },
    ]);
    console.log('✅ [ORDER_DB] Đã seed 2 ca làm việc chuẩn (Ca 1 & Ca 2).');
  }

  // 2. Seed Employees
  const employeeRepo = ds.getRepository('Employee');
  const empCount = await employeeRepo.count();
  console.log(`[ORDER_DB] Số lượng nhân viên hiện có: ${empCount}`);
  if (empCount === 0) {
    console.log('[ORDER_DB] Bắt đầu seed nhân viên mẫu...');
    await employeeRepo.save([
      {
        employeeCode: 'NV01',
        fullName: 'Nguyễn Văn An',
        phone: '0901234567',
        branchId: '1',
        role: 'CASHIER',
        isActive: true,
        pinCode: '123456',
      },
      {
        employeeCode: 'NV02',
        fullName: 'Trần Thị Bích',
        phone: '0902345678',
        branchId: '1',
        role: 'KITCHEN',
        isActive: true,
        pinCode: '123456',
      },
      {
        employeeCode: 'NV03',
        fullName: 'Lê Hoàng Nam',
        phone: '0903456789',
        branchId: '1',
        role: 'WAITER',
        isActive: true,
        pinCode: '123456',
      },
    ]);
    console.log('✅ [ORDER_DB] Đã seed 3 nhân viên mẫu: NV01, NV02, NV03.');
  }

  const shifts = await shiftRepo.find();
  console.log('📋 Danh sách Ca làm việc trên Neon order_db:');
  console.table(shifts.map(s => ({ code: s.code, name: s.name, start: s.startTime, end: s.endTime })));

  const employees = await employeeRepo.find();
  console.log('📋 Danh sách Nhân viên trên Neon order_db:');
  console.table(employees.map(e => ({ code: e.employeeCode, name: e.fullName, role: e.role, phone: e.phone })));

  await ds.destroy();
}

async function syncAndSeedInventory() {
  console.log('\n======================================================');
  console.log('3. [INVENTORY_DB] Kết nối và Đồng bộ Schema lên Neon Cloud');
  console.log('======================================================');
  const ds = new DataSource({
    type: 'postgres',
    url: NEON_CONFIG.inventory.url,
    entities: NEON_CONFIG.inventory.entities,
    synchronize: true,
    ssl: { rejectUnauthorized: false },
    extra: { ssl: { rejectUnauthorized: false } },
  });

  await ds.initialize();
  console.log('✅ [INVENTORY_DB] Kết nối Neon thành công & Schema đã được đồng bộ!');

  const ingredientRepo = ds.getRepository('Ingredient');
  const stockRepo = ds.getRepository('Stock');
  const recipeRepo = ds.getRepository('Recipe');
  const recipeItemRepo = ds.getRepository('RecipeItem');

  const ingCount = await ingredientRepo.count();
  console.log(`[INVENTORY_DB] Số lượng nguyên liệu hiện có: ${ingCount}`);

  if (ingCount === 0) {
    console.log('[INVENTORY_DB] Bắt đầu seed nguyên liệu & công thức...');
    const coffee = await ingredientRepo.save({ name: 'Cà phê hạt Robusta', unit: 'g', minStockThreshold: 1000 });
    const milk = await ingredientRepo.save({ name: 'Sữa đặc Ngôi Sao', unit: 'ml', minStockThreshold: 500 });
    const sugar = await ingredientRepo.save({ name: 'Đường cát trắng', unit: 'g', minStockThreshold: 500 });
    const tea = await ingredientRepo.save({ name: 'Trà đen Phúc Long', unit: 'g', minStockThreshold: 1000 });
    const boba = await ingredientRepo.save({ name: 'Trân châu đen Đài Loan', unit: 'g', minStockThreshold: 2000 });
    const freshMilk = await ingredientRepo.save({ name: 'Sữa tươi thanh trùng Dalat Milk', unit: 'ml', minStockThreshold: 2000 });
    const matcha = await ingredientRepo.save({ name: 'Bột Matcha Uji Nhật Bản', unit: 'g', minStockThreshold: 300 });

    console.log('✅ Đã tạo 7 nguyên liệu.');

    // Seed stock for branch 1
    await stockRepo.save([
      { branchId: '1', ingredientId: coffee.id, currentQuantity: 10000 },
      { branchId: '1', ingredientId: milk.id, currentQuantity: 5000 },
      { branchId: '1', ingredientId: sugar.id, currentQuantity: 8000 },
      { branchId: '1', ingredientId: tea.id, currentQuantity: 6000 },
      { branchId: '1', ingredientId: boba.id, currentQuantity: 15000 },
      { branchId: '1', ingredientId: freshMilk.id, currentQuantity: 12000 },
      { branchId: '1', ingredientId: matcha.id, currentQuantity: 2000 },
    ]);
    console.log('✅ Đã seed tồn kho an toàn cho Chi nhánh 1.');

    // Seed Recipe 1: Cà phê sữa đá (Product ID: 1)
    const recipeM = await recipeRepo.save({ productId: '1', size: 'M' });
    await recipeItemRepo.save([
      { recipe: recipeM, ingredientId: coffee.id, quantityNeeded: 25 },
      { recipe: recipeM, ingredientId: milk.id, quantityNeeded: 40 },
    ]);

    const recipeL = await recipeRepo.save({ productId: '1', size: 'L' });
    await recipeItemRepo.save([
      { recipe: recipeL, ingredientId: coffee.id, quantityNeeded: 35 },
      { recipe: recipeL, ingredientId: milk.id, quantityNeeded: 55 },
    ]);

    // Seed Recipe 2: Trà sữa trân châu (Product ID: 2)
    const recipeTsM = await recipeRepo.save({ productId: '2', size: 'M' });
    await recipeItemRepo.save([
      { recipe: recipeTsM, ingredientId: tea.id, quantityNeeded: 15 },
      { recipe: recipeTsM, ingredientId: freshMilk.id, quantityNeeded: 150 },
      { recipe: recipeTsM, ingredientId: sugar.id, quantityNeeded: 20 },
    ]);

    console.log('✅ Đã seed công thức định mức chế biến (Recipes M & L).');
  } else {
    console.log('ℹ️ [INVENTORY_DB] Đã có dữ liệu kho, bỏ qua seed mặc định.');
  }

  const ingredients = await ingredientRepo.find();
  console.log('📋 Danh sách Nguyên liệu trên Neon inventory_db:');
  console.table(ingredients.map(i => ({ id: i.id, name: i.name, unit: i.unit, minThreshold: i.minStockThreshold })));

  const stocks = await stockRepo.find();
  console.log('📋 Danh sách Tồn kho Chi nhánh 1 trên Neon inventory_db:');
  console.table(stocks.map(s => ({ branch: s.branchId, ingredientId: s.ingredientId, quantity: s.currentQuantity })));

  await ds.destroy();
}

async function main() {
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ VÀ SEED DỮ LIỆU LÊN NEON CLOUD POSTGRESQL');
  console.log('Thời gian:', new Date().toLocaleString());
  try {
    await syncAndSeedAuth();
    await syncAndSeedOrder();
    await syncAndSeedInventory();
    console.log('\n🎉 HOÀN TẤT ĐỒNG BỘ TOÀN BỘ CƠ SỞ DỮ LIỆU LÊN NEON CLOUD THÀNH CÔNG!');
  } catch (error) {
    console.error('\n❌ Xảy ra lỗi trong quá trình đồng bộ:', error);
    process.exit(1);
  }
}

main();
