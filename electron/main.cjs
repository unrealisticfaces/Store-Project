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
const backupDir = path.join(userDataPath, 'StoreManagerBackups');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

// --- AUTOMATED BACKUPS ---
function runDailyBackup() {
  const today = new Date().toISOString().split('T')[0];
  const backupFile = path.join(backupDir, `store_backup_${today}.db`);
  if (!fs.existsSync(backupFile) && fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupFile);
    console.log(`Backup created: ${backupFile}`);
  }
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sku TEXT UNIQUE, price REAL, stock INTEGER, category TEXT, image TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, store_credit REAL DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS shifts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, start_time TEXT, end_time TEXT, starting_cash REAL, expected_cash REAL, actual_cash REAL, status TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, shift_id INTEGER, total REAL, credit_used REAL DEFAULT 0, date TEXT, FOREIGN KEY(customer_id) REFERENCES customers(id), FOREIGN KEY(shift_id) REFERENCES shifts(id))`);
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
  runDailyBackup();
  setInterval(runDailyBackup, 1000 * 60 * 60); // Check every hour
  
  protocol.handle('asset', async (request) => {
    const fileName = request.url.replace('asset://', '').split('?')[0];
    try {
      const data = await fs.promises.readFile(path.join(uploadsDir, decodeURIComponent(fileName)));
      const ext = path.extname(fileName).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';
      return new Response(data, { headers: { 'Content-Type': mimeType, 'Access-Control-Allow-Origin': '*' } });
    } catch (e) { return new Response(null, { status: 404 }); }
  });
  
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// --- SHIFTS & Z-REPORTS ---
ipcMain.handle('get-active-shift', () => new Promise((resolve) => db.get("SELECT * FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1", [], (err, row) => resolve(row || null))));

ipcMain.handle('open-shift', (event, { userId, startingCash }) => new Promise((resolve, reject) => {
  db.run("INSERT INTO shifts (user_id, start_time, starting_cash, status) VALUES (?, ?, ?, 'open')", [userId, new Date().toISOString(), startingCash], function(err) { err ? reject(err) : resolve({ id: this.lastID }); });
}));

ipcMain.handle('close-shift', (event, { shiftId, actualCash }) => new Promise((resolve, reject) => {
  db.get("SELECT starting_cash FROM shifts WHERE id = ?", [shiftId], (err, shift) => {
    db.get("SELECT SUM(total - credit_used) as cash_sales FROM orders WHERE shift_id = ?", [shiftId], (err, sales) => {
       const cashSales = (sales && sales.cash_sales) ? sales.cash_sales : 0;
       const expected = shift.starting_cash + cashSales;
       db.run("UPDATE shifts SET end_time = ?, expected_cash = ?, actual_cash = ?, status = 'closed' WHERE id = ?", [new Date().toISOString(), expected, actualCash, shiftId], function(err) { 
         err ? reject(err) : resolve({ success: true, expected, actualCash, cashSales }); 
       });
    });
  });
}));

ipcMain.handle('print-z-report', async (event, { shiftData, settings, userName }) => {
  return new Promise(async (resolve) => {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    const sym = settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency === 'PHP' ? '₱' : '$';
    const overShort = shiftData.actualCash - shiftData.expected;
    const html = `<html><head><style>body{font-family:monospace;color:#000;margin:0;padding:10px;width:280px;}.hdr{text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;margin-bottom:10px;}.row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;}</style></head><body><div class="hdr"><h2>${settings.storeName}</h2><p>Z-REPORT (END OF SHIFT)</p><p>${new Date().toLocaleString()}</p></div><div class="row"><span>Cashier:</span><span>${userName}</span></div><div class="row"><span>Starting Cash:</span><span>${sym}${shiftData.startingCash.toFixed(2)}</span></div><div class="row"><span>Cash Sales:</span><span>${sym}${shiftData.cashSales.toFixed(2)}</span></div><div class="row" style="border-top:1px dashed #000;padding-top:5px;"><span><b>EXPECTED IN DRAWER:</b></span><span><b>${sym}${shiftData.expected.toFixed(2)}</b></span></div><div class="row"><span>Actual Cash Counted:</span><span>${sym}${shiftData.actualCash.toFixed(2)}</span></div><div class="row" style="margin-top:10px;border-bottom:1px dashed #000;padding-bottom:10px;"><span>OVER/SHORT:</span><span style="font-weight:bold;">${sym}${overShort.toFixed(2)}</span></div><div style="text-align:center;margin-top:20px;font-size:12px;">Manager Signature:<br><br>____________________</div></body></html>`;
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    printWin.webContents.print({ silent: false, printBackground: true }, (success) => { printWin.close(); resolve(success); });
  });
});

// --- BULK INVENTORY IMPORT ---
ipcMain.handle('import-csv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { title: 'Import Inventory CSV', filters: [{ name: 'CSV Files', extensions: ['csv'] }] });
  if (canceled || filePaths.length === 0) return { success: false, count: 0 };
  const content = fs.readFileSync(filePaths[0], 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let importedCount = 0;
  return new Promise((resolve) => {
    db.serialize(() => {
      const stmt = db.prepare("INSERT OR IGNORE INTO products (name, sku, price, stock, category, image) VALUES (?, ?, ?, ?, ?, '')");
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 5) {
          const name = cols[0].trim(), sku = cols[1].trim(), price = parseFloat(cols[2]), stock = parseInt(cols[3], 10), category = cols[4].trim();
          if (name && sku && !isNaN(price) && !isNaN(stock)) { stmt.run(name, sku, price, stock, category); importedCount++; }
        }
      }
      stmt.finalize(() => resolve({ success: true, count: importedCount }));
    });
  });
});

// --- PRODUCTS ---
ipcMain.handle('select-image', async () => { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] }); if(r.canceled) return null; const f = Date.now()+path.basename(r.filePaths[0]); fs.copyFileSync(r.filePaths[0], path.join(uploadsDir, f)); return `asset://${f}`; });
ipcMain.handle('get-products', () => new Promise(res => db.all("SELECT * FROM products", [], (e, r) => res(r))));
ipcMain.handle('add-product', (e, p) => new Promise(res => db.run("INSERT INTO products (name,sku,price,stock,category,image) VALUES (?,?,?,?,?,?)", [p.name,p.sku,p.price,p.stock,p.category,p.image], function() { res({id:this.lastID,...p}); })));
ipcMain.handle('delete-product', (e, id) => new Promise(res => db.run("DELETE FROM products WHERE id=?", [id], () => res({success:true}))));
ipcMain.handle('update-stock', (e, {id, newStock}) => new Promise(res => db.run("UPDATE products SET stock=? WHERE id=?", [newStock, id], () => res({success:true}))));

// --- ORDERS ---
ipcMain.handle('process-order', (e, { cart, customerId, shiftId, creditUsed }) => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.get("SELECT value FROM settings WHERE key='taxRate'", (err, row) => {
      const tax = row ? parseFloat(row.value)/100 : 0; let sub = 0; cart.forEach(i => sub += (i.price*i.quantity)); const total = sub + (sub*tax);
      if (customerId && creditUsed > 0) db.run("UPDATE customers SET store_credit=store_credit-? WHERE id=?", [creditUsed, customerId]);
      db.run("INSERT INTO orders (customer_id, shift_id, total, credit_used, date) VALUES (?, ?, ?, ?, ?)", [customerId||null, shiftId, total, creditUsed||0, new Date().toISOString()], function(err) {
        if(err) return reject(err); const oId = this.lastID; let c = 0;
        cart.forEach(i => {
          db.run("INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?,?,?,?)", [oId, i.name, i.quantity, i.price]);
          db.run("UPDATE products SET stock=stock-? WHERE id=?", [i.quantity, i.id], () => { c++; if(c===cart.length) resolve({success:true}); });
        });
      });
    });
  });
}));

// --- MISCELLANEOUS (Customers, Auth, Settings, Export, Print) ---
ipcMain.handle('get-customers', () => new Promise(res => db.all("SELECT * FROM customers ORDER BY name ASC", [], (e, r) => res(r))));
ipcMain.handle('add-customer', (e, c) => new Promise(res => db.run("INSERT INTO customers (name,phone,email,store_credit) VALUES (?,?,?,?)", [c.name,c.phone,c.email,c.store_credit||0], function(){res({id:this.lastID});})));
ipcMain.handle('update-credit', (e, {id, amount}) => new Promise(res => db.run("UPDATE customers SET store_credit=store_credit+? WHERE id=?", [amount,id], ()=>res({success:true}))));
ipcMain.handle('delete-customer', (e, id) => new Promise(res => db.run("DELETE FROM customers WHERE id=?", [id], ()=>res({success:true}))));
ipcMain.handle('get-dashboard-stats', (e, r) => new Promise(res => { 
  db.serialize(() => {
    const stats = { revenue: 0, salesCount: 0, recentSales: [], chartData: [], lowStock: [] };
    let dateFilter = "";
    if (r === 'today') dateFilter = "WHERE date >= date('now')";
    else if (r === '7days') dateFilter = "WHERE date >= datetime('now', '-7 days')";
    else if (r === '30days') dateFilter = "WHERE date >= datetime('now', '-30 days')";
    db.get(`SELECT SUM(total) as revenue, COUNT(id) as count FROM orders ${dateFilter}`, [], (err, row) => {
      if (!err && row) { stats.revenue = row.revenue || 0; stats.salesCount = row.count || 0; }
      db.all(`SELECT id, total, date FROM orders ${dateFilter} ORDER BY date DESC LIMIT 5`, [], (err, rows) => {
        if (!err && rows) stats.recentSales = rows;
        db.all("SELECT strftime('%m', date) as month, SUM(total) as total FROM orders GROUP BY month ORDER BY month ASC LIMIT 12", [], (err, chartRows) => {
          if (!err && chartRows) {
            const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            stats.chartData = chartRows.map(r => ({ name: m[parseInt(r.month, 10)-1], total: r.total }));
          }
          db.all("SELECT id, name, sku, stock, image FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 8", [], (err, lowRows) => {
            if (!err && lowRows) stats.lowStock = lowRows;
            res(stats);
          });
        });
      });
    });
  });
}));
ipcMain.handle('get-transactions', () => new Promise(res => db.all("SELECT orders.*, customers.name as customer_name FROM orders LEFT JOIN customers ON orders.customer_id = customers.id ORDER BY date DESC", [], (e, orders) => { db.all("SELECT * FROM order_items", [], (e, items) => { res(orders.map(o => ({...o, items: items.filter(i => i.order_id === o.id)}))); }); })));
ipcMain.handle('get-categories', () => new Promise(res => db.all("SELECT * FROM categories", [], (e, r) => res(r))));
ipcMain.handle('add-category', (e, n) => new Promise(res => db.run("INSERT INTO categories (name) VALUES (?)", [n], function(){res({id:this.lastID});})));
ipcMain.handle('delete-category', (e, id) => new Promise(res => db.run("DELETE FROM categories WHERE id=?", [id], ()=>res({success:true}))));
ipcMain.handle('get-settings', () => new Promise(res => db.all("SELECT * FROM settings", [], (e, r) => res(r))));
ipcMain.handle('update-setting', (e, {key, value}) => new Promise(res => db.run("UPDATE settings SET value=? WHERE key=?", [value, key], ()=>res({success:true}))));
ipcMain.handle('login', (e, {username, password}) => new Promise(res => db.get("SELECT id, name, username, role FROM users WHERE username=? AND password=?", [username, password], (err, u) => res(u||null))));
ipcMain.handle('get-users', () => new Promise(res => db.all("SELECT id, name, username, role FROM users", [], (e, r) => res(r))));
ipcMain.handle('add-user', (e, u) => new Promise(res => db.run("INSERT INTO users (name,username,password,role) VALUES (?,?,?,?)", [u.name,u.username,u.password,u.role], function(){res({id:this.lastID});})));
ipcMain.handle('delete-user', (e, id) => new Promise(res => db.run("DELETE FROM users WHERE id=?", [id], ()=>res({success:true}))));
ipcMain.handle('manual-backup', async () => { const d = path.join(backupDir, `manual_backup_${Date.now()}.db`); fs.copyFileSync(dbPath, d); return d; });
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
    let creditHtml = '';
    if (order.credit_used > 0) creditHtml = `<div style="display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px;"><span>Credit Used:</span><span>-${currency}${order.credit_used.toFixed(2)}</span></div>`;
    const html = `<html><head><style>body { font-family: monospace; color: #000; margin: 0; padding: 10px; width: 280px; } .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; } .header h2 { margin: 0 0 5px 0; font-size: 18px; } .header p { margin: 2px 0; font-size: 12px; } .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px; } .total { font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 8px; margin-top: 5px; display: flex; justify-content: space-between; }</style></head><body><div class="header"><h2>${settings.storeName || 'Store Receipt'}</h2><p>Order #${order.id}</p><p>${new Date(order.date).toLocaleString()}</p>${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ''}</div><div style="margin-bottom: 10px;">${itemsHtml}</div>${creditHtml}<div class="total"><span>TOTAL PAID:</span><span>${currency}${(order.total - order.credit_used).toFixed(2)}</span></div><div class="footer"><p>Thank you for your purchase!</p><p>*** CUSTOMER COPY ***</p></div></body></html>`;
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    printWin.webContents.print({ silent: false, printBackground: true }, (success) => { printWin.close(); resolve(success); });
  });
});