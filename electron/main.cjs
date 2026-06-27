const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { bypassCSP: true, standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const userDataPath = app.getPath('userData');
const dbPath = path.join(__dirname, 'store.db');
const uploadsDir = path.join(userDataPath, 'StoreManagerUploads');
const backupDir = path.join(userDataPath, 'StoreManagerBackups'); // NEW: Backup folder

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

// --- AUTOMATED BACKUP SYSTEM ---
function runDailyBackup() {
  const today = new Date().toISOString().split('T')[0]; // Gets YYYY-MM-DD
  const backupFile = path.join(backupDir, `store_backup_${today}.db`);
  
  if (!fs.existsSync(backupFile) && fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupFile);
    console.log(`[System] Daily backup created: ${backupFile}`);
  }
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sku TEXT UNIQUE, price REAL, stock INTEGER, category TEXT, image TEXT)`);
  
  // NEW: Customers Table
  db.run(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, store_credit REAL DEFAULT 0)`);
  
  // UPDATED: Orders Table now accepts customer_id
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, total REAL, credit_used REAL DEFAULT 0, date TEXT, FOREIGN KEY(customer_id) REFERENCES customers(id))`);
  
  db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_name TEXT, quantity INTEGER, price REAL, FOREIGN KEY(order_id) REFERENCES orders(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, username TEXT UNIQUE, password TEXT, role TEXT)`);

  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) db.run("INSERT INTO users (name, username, password, role) VALUES ('Super Admin', 'admin', 'admin123', 'admin')");
  });
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });

  if (process.env.NODE_ENV === 'development') mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  runDailyBackup(); // Run backup check on startup
  setInterval(runDailyBackup, 1000 * 60 * 60); // Check every hour if a new day has started

  protocol.handle('asset', async (request) => {
    const fileName = request.url.replace('asset://', '').split('?')[0];
    const filePath = path.join(uploadsDir, decodeURIComponent(fileName));
    try {
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';
      return new Response(data, { headers: { 'Content-Type': mimeType, 'Access-Control-Allow-Origin': '*' } });
    } catch (error) { return new Response(null, { status: 404 }); }
  });
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Products & Inventory
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }] });
  if (result.canceled) return null;
  const fileName = Date.now() + '-' + path.basename(result.filePaths[0]).replace(/\s+/g, '-');
  fs.copyFileSync(result.filePaths[0], path.join(uploadsDir, fileName));
  return `asset://${fileName}`;
});
ipcMain.handle('get-products', () => new Promise((resolve, reject) => db.all("SELECT * FROM products", [], (err, rows) => err ? reject(err) : resolve(rows))));
ipcMain.handle('add-product', (event, p) => new Promise((resolve, reject) => db.run("INSERT INTO products (name, sku, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?)", [p.name, p.sku, p.price, p.stock, p.category, p.image], function(err) { err ? reject(err) : resolve({ id: this.lastID, ...p }); })));
ipcMain.handle('delete-product', (event, id) => new Promise((resolve, reject) => db.run("DELETE FROM products WHERE id = ?", [id], function(err) { err ? reject(err) : resolve({ success: true }); })));
ipcMain.handle('update-stock', (event, { id, newStock }) => new Promise((resolve, reject) => db.run("UPDATE products SET stock = ? WHERE id = ?", [newStock, id], function(err) { err ? reject(err) : resolve({ success: true }); })));

// UPDATED: Orders processing now handles Customers and Store Credit deduction
ipcMain.handle('process-order', (event, { cart, customerId, creditUsed }) => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.get("SELECT value FROM settings WHERE key = 'taxRate'", (err, row) => {
      const taxRate = row && !isNaN(parseFloat(row.value)) ? parseFloat(row.value) / 100 : 0;
      let subtotal = 0;
      cart.forEach(item => subtotal += (item.price * item.quantity));
      const total = subtotal + (subtotal * taxRate);
      
      // Deduct Store Credit if used
      if (customerId && creditUsed > 0) {
        db.run("UPDATE customers SET store_credit = store_credit - ? WHERE id = ?", [creditUsed, customerId]);
      }

      db.run("INSERT INTO orders (customer_id, total, credit_used, date) VALUES (?, ?, ?, ?)", [customerId || null, total, creditUsed || 0, new Date().toISOString()], function(err) {
        if (err) return reject(err);
        const orderId = this.lastID;
        let completed = 0;
        cart.forEach(item => {
          db.run("INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)", [orderId, item.name, item.quantity, item.price]);
          db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id], () => {
            completed++;
            if (completed === cart.length) resolve({ success: true });
          });
        });
      });
    });
  });
}));

// NEW: Customer IPC Handlers
ipcMain.handle('get-customers', () => new Promise((resolve, reject) => db.all("SELECT * FROM customers ORDER BY name ASC", [], (err, rows) => err ? reject(err) : resolve(rows))));
ipcMain.handle('add-customer', (event, c) => new Promise((resolve, reject) => db.run("INSERT INTO customers (name, phone, email, store_credit) VALUES (?, ?, ?, ?)", [c.name, c.phone, c.email, c.store_credit || 0], function(err) { err ? reject(err) : resolve({ id: this.lastID, ...c }); })));
ipcMain.handle('update-credit', (event, { id, amount }) => new Promise((resolve, reject) => db.run("UPDATE customers SET store_credit = store_credit + ? WHERE id = ?", [amount, id], function(err) { err ? reject(err) : resolve({ success: true }); })));
ipcMain.handle('delete-customer', (event, id) => new Promise((resolve, reject) => db.run("DELETE FROM customers WHERE id = ?", [id], function(err) { err ? reject(err) : resolve({ success: true }); })));

// Dashboards, Auth, Transactions, etc...
ipcMain.handle('get-dashboard-stats', (event, range = 'all') => new Promise((resolve, reject) => {
  db.serialize(() => {
    const stats = { revenue: 0, salesCount: 0, recentSales: [], chartData: [], lowStock: [] };
    let dateFilter = "";
    if (range === 'today') dateFilter = "WHERE date >= date('now')";
    else if (range === '7days') dateFilter = "WHERE date >= datetime('now', '-7 days')";
    else if (range === '30days') dateFilter = "WHERE date >= datetime('now', '-30 days')";

    db.get(`SELECT SUM(total) as revenue, COUNT(id) as count FROM orders ${dateFilter}`, [], (err, row) => {
      if (!err && row) { stats.revenue = row.revenue || 0; stats.salesCount = row.count || 0; }
      db.all(`SELECT id, total, date FROM orders ${dateFilter} ORDER BY date DESC LIMIT 5`, [], (err, rows) => {
        if (!err && rows) stats.recentSales = rows;
        db.all("SELECT strftime('%m', date) as month, SUM(total) as total FROM orders GROUP BY month ORDER BY month ASC LIMIT 12", [], (err, chartRows) => {
          if (!err && chartRows) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            stats.chartData = chartRows.map(r => ({ name: monthNames[parseInt(r.month, 10) - 1], total: r.total }));
          }
          db.all("SELECT id, name, sku, stock, image FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 8", [], (err, lowRows) => {
            if (!err && lowRows) stats.lowStock = lowRows;
            resolve(stats);
          });
        });
      });
    });
  });
}));

ipcMain.handle('get-transactions', () => new Promise((resolve, reject) => db.all("SELECT orders.*, customers.name as customer_name FROM orders LEFT JOIN customers ON orders.customer_id = customers.id ORDER BY date DESC", [], (err, orders) => {
  if (err) return reject(err);
  if (orders.length === 0) return resolve([]);
  db.all("SELECT * FROM order_items", [], (err, items) => {
    if (err) return reject(err);
    resolve(orders.map(order => ({ ...order, items: items.filter(item => item.order_id === order.id) })));
  });
})));
ipcMain.handle('get-categories', () => new Promise((resolve, reject) => db.all("SELECT * FROM categories", [], (err, rows) => err ? reject(err) : resolve(rows))));
ipcMain.handle('add-category', (event, name) => new Promise((resolve, reject) => db.run("INSERT INTO categories (name) VALUES (?)", [name], function(err) { err ? reject(err) : resolve({ id: this.lastID, name }); })));
ipcMain.handle('delete-category', (event, id) => new Promise((resolve, reject) => db.run("DELETE FROM categories WHERE id = ?", [id], function(err) { err ? reject(err) : resolve({ success: true }); })));
ipcMain.handle('get-settings', () => new Promise((resolve, reject) => db.all("SELECT * FROM settings", [], (err, rows) => err ? reject(err) : resolve(rows))));
ipcMain.handle('update-setting', (event, { key, value }) => new Promise((resolve, reject) => db.run("UPDATE settings SET value = ? WHERE key = ?", [value, key], function(err) { err ? reject(err) : resolve({ success: true }); })));
ipcMain.handle('login', (event, { username, password }) => new Promise((resolve, reject) => { db.get("SELECT id, name, username, role FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => { err ? reject(err) : resolve(user || null); }); }));
ipcMain.handle('get-users', () => new Promise((resolve, reject) => db.all("SELECT id, name, username, role FROM users", [], (err, rows) => err ? reject(err) : resolve(rows))));
ipcMain.handle('add-user', (event, u) => new Promise((resolve, reject) => db.run("INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)", [u.name, u.username, u.password, u.role], function(err) { err ? reject(err) : resolve({ id: this.lastID, ...u }); })));
ipcMain.handle('delete-user', (event, id) => new Promise((resolve, reject) => db.run("DELETE FROM users WHERE id = ?", [id], function(err) { err ? reject(err) : resolve({ success: true }); })));

// NEW: Manual Backup Handler
ipcMain.handle('manual-backup', async () => {
  const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const dest = path.join(backupDir, `manual_backup_${dateStr}.db`);
  fs.copyFileSync(dbPath, dest);
  return dest;
});

// Print & Export
ipcMain.handle('export-csv', async (event, transactions) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { title: 'Export Sales Data', defaultPath: `Sales_Export_${new Date().toISOString().split('T')[0]}.csv`, filters: [{ name: 'CSV Files', extensions: ['csv'] }] });
  if (canceled || !filePath) return false;
  const rows = transactions.map(t => {
    const itemsCount = t.items ? t.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    return `${t.id},"${new Date(t.date).toLocaleString()}",${itemsCount},${t.total.toFixed(2)}`;
  }).join('\n');
  fs.writeFileSync(filePath, "Order ID,Date,Total Items,Amount Paid\n" + rows);
  return true;
});

ipcMain.handle('print-receipt', async (event, { order, settings }) => {
  return new Promise(async (resolve) => {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    const currency = settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency === 'PHP' ? '₱' : '$';
    let itemsHtml = order.items.map(i => `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;"><span style="flex-1; padding-right: 10px;">${i.quantity}x ${i.product_name}</span><span>${currency}${(i.price * i.quantity).toFixed(2)}</span></div>`).join('');
    
    // Add Store Credit line if used
    let creditHtml = '';
    if (order.credit_used > 0) {
      creditHtml = `<div style="display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px;">
        <span>Credit Used:</span><span>-${currency}${order.credit_used.toFixed(2)}</span>
      </div>`;
    }

    const html = `<html><head><style>body { font-family: monospace; color: #000; margin: 0; padding: 10px; width: 280px; } .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; } .header h2 { margin: 0 0 5px 0; font-size: 18px; } .header p { margin: 2px 0; font-size: 12px; } .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px; } .total { font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 8px; margin-top: 5px; display: flex; justify-content: space-between; }</style></head><body><div class="header"><h2>${settings.storeName || 'Store Receipt'}</h2><p>Order #${order.id}</p><p>${new Date(order.date).toLocaleString()}</p>${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ''}</div><div style="margin-bottom: 10px;">${itemsHtml}</div>${creditHtml}<div class="total"><span>TOTAL PAID:</span><span>${currency}${(order.total - order.credit_used).toFixed(2)}</span></div><div class="footer"><p>Thank you for your purchase!</p><p>*** CUSTOMER COPY ***</p></div></body></html>`;
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    printWin.webContents.print({ silent: false, printBackground: true }, (success) => { printWin.close(); resolve(success); });
  });
});