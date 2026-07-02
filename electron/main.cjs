const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { bypassCSP: true, standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'store.db');
const uploadsDir = path.join(userDataPath, 'StoreManagerUploads');
const backupDir = path.join(userDataPath, 'StoreManagerBackups');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

function runDailyBackup() {
  const today = new Date().toISOString().split('T')[0];
  const backupFile = path.join(backupDir, `store_backup_${today}.db`);
  if (!fs.existsSync(backupFile) && fs.existsSync(dbPath)) fs.copyFileSync(dbPath, backupFile);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sku TEXT UNIQUE, price REAL, stock INTEGER, category TEXT, image TEXT, updated_at TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, store_credit REAL DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS shifts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, start_time TEXT, end_time TEXT, starting_cash REAL, expected_cash REAL, actual_cash REAL, status TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, shift_id INTEGER, invoice_id TEXT, total REAL, credit_used REAL DEFAULT 0, discount REAL DEFAULT 0, date TEXT, status TEXT DEFAULT 'completed', FOREIGN KEY(customer_id) REFERENCES customers(id), FOREIGN KEY(shift_id) REFERENCES shifts(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_name TEXT, quantity INTEGER, price REAL, FOREIGN KEY(order_id) REFERENCES orders(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, username TEXT UNIQUE, password TEXT, role TEXT, image TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS inventory_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, product_name TEXT, sku TEXT, action TEXT, quantity INTEGER, date TEXT)`);

  db.run(`ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'completed'`, () => {});
  db.run(`ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0`, () => {});
  db.run(`ALTER TABLE orders ADD COLUMN invoice_id TEXT`, () => {});
  db.run(`ALTER TABLE products ADD COLUMN updated_at TEXT`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN image TEXT`, () => {});
  db.run(`ALTER TABLE inventory_logs ADD COLUMN sku TEXT`, () => {});
  
  // NEW: Add complete transaction tracking columns
  db.run(`ALTER TABLE orders ADD COLUMN cash_handed REAL DEFAULT 0`, () => {});
  db.run(`ALTER TABLE orders ADD COLUMN change REAL DEFAULT 0`, () => {});
  db.run(`ALTER TABLE orders ADD COLUMN tax_rate REAL DEFAULT 0`, () => {});

  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) db.run("INSERT INTO users (name, username, password, role, image) VALUES ('Super Admin', 'admin', 'admin123', 'admin', '')");
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
  setInterval(runDailyBackup, 1000 * 60 * 60);
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

ipcMain.handle('get-active-shift', () => new Promise((resolve) => {
  db.get("SELECT * FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1", [], (err, shift) => {
    if (!shift) return resolve(null);
    db.get("SELECT SUM(total - credit_used) as cash_sales FROM orders WHERE shift_id = ? AND status = 'completed'", [shift.id], (err, sales) => {
      const cashSales = (sales && sales.cash_sales) ? sales.cash_sales : 0;
      shift.current_expected = shift.starting_cash + cashSales;
      resolve(shift);
    });
  });
}));

ipcMain.handle('open-shift', (event, { userId, startingCash }) => new Promise((resolve, reject) => {
  db.run("INSERT INTO shifts (user_id, start_time, starting_cash, status) VALUES (?, ?, ?, 'open')", [userId, new Date().toISOString(), startingCash], function(err) { err ? reject(err) : resolve({ id: this.lastID }); });
}));

ipcMain.handle('close-shift', (event, { shiftId, actualCash }) => new Promise((resolve, reject) => {
  db.get("SELECT starting_cash FROM shifts WHERE id = ?", [shiftId], (err, shift) => {
    db.get("SELECT SUM(total - credit_used) as cash_sales FROM orders WHERE shift_id = ? AND status = 'completed'", [shiftId], (err, sales) => {
       const cashSales = (sales && sales.cash_sales) ? sales.cash_sales : 0;
       const expected = (shift ? shift.starting_cash : 0) + cashSales;
       db.run("UPDATE shifts SET end_time = ?, expected_cash = ?, actual_cash = ?, status = 'closed' WHERE id = ?", [new Date().toISOString(), expected, actualCash, shiftId], function(err) { err ? reject(err) : resolve({ success: true, expected, actualCash, cashSales }); });
    });
  });
}));

ipcMain.handle('print-z-report', async (event, { shiftData, settings, userName }) => {
  return new Promise(async (resolve) => {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    const sym = settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency === 'PHP' ? '₱' : '$';
    const overShort = shiftData.actualCash - shiftData.expected;
    const html = `<html><head><style>body{font-family:monospace;color:#000;margin:0;padding:10px;width:280px;}.hdr{text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;margin-bottom:10px;}.hdr h2{margin:0 0 5px 0;font-size:18px;}.hdr p{margin:2px 0;font-size:12px;}.row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;}</style></head><body><div class="hdr"><h2>${settings.storeName || 'Store'}</h2>${settings.storeAddress ? `<p>${settings.storeAddress}</p>` : ''}${settings.storePhone ? `<p>${settings.storePhone}</p>` : ''}<p>Z-REPORT</p><p>${new Date().toLocaleString()}</p></div><div class="row"><span>Cashier:</span><span>${userName}</span></div><div class="row"><span>Starting Cash:</span><span>${sym}${shiftData.startingCash.toFixed(2)}</span></div><div class="row"><span>Cash Sales:</span><span>${sym}${shiftData.cashSales.toFixed(2)}</span></div><div class="row" style="border-top:1px dashed #000;padding-top:5px;"><span><b>EXPECTED:</b></span><span><b>${sym}${shiftData.expected.toFixed(2)}</b></span></div><div class="row"><span>Actual Cash:</span><span>${sym}${shiftData.actualCash.toFixed(2)}</span></div><div class="row" style="margin-top:10px;border-bottom:1px dashed #000;padding-bottom:10px;"><span>OVER/SHORT:</span><span style="font-weight:bold;">${sym}${overShort.toFixed(2)}</span></div><div style="text-align:center;margin-top:20px;font-size:12px;">Manager Signature:<br><br>____________________</div></body></html>`;
    
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    printWin.webContents.print({ silent: false, printBackground: true }, async (success) => { 
      if (!success) {
        try {
          const pdfData = await printWin.webContents.printToPDF({ printBackground: true });
          const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Z-Report as PDF',
            defaultPath: `Z_Report_${new Date().toISOString().split('T')[0]}.pdf`,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
          });
          if (filePath) { fs.writeFileSync(filePath, pdfData); resolve(true); } else { resolve(false); }
        } catch (error) { resolve(false); } finally { printWin.close(); }
      } else {
        setTimeout(() => { printWin.close(); resolve(true); }, 1000); 
      }
    });
  });
});

ipcMain.handle('import-csv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { title: 'Import Inventory CSV', filters: [{ name: 'CSV Files', extensions: ['csv'] }] });
  if (canceled || filePaths.length === 0) return { success: false, count: 0 };
  const content = fs.readFileSync(filePaths[0], 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let importedCount = 0;
  return new Promise((resolve) => {
    db.serialize(() => {
      const stmt = db.prepare("INSERT OR IGNORE INTO products (name, sku, price, stock, category, image, updated_at) VALUES (?, ?, ?, ?, ?, '', ?)");
      const logStmt = db.prepare("INSERT INTO inventory_logs (product_name, sku, action, quantity, date) VALUES (?, ?, 'Imported', ?, ?)");
      const now = new Date().toISOString();
      const localNow = new Date().toLocaleString();
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 5) {
          const name = cols[0].trim(), sku = cols[1].trim(), price = parseFloat(cols[2]), stock = parseInt(cols[3], 10), category = cols[4].trim();
          if (name && sku && !isNaN(price) && !isNaN(stock)) { 
            stmt.run(name, sku, price, stock, category, localNow); 
            logStmt.run(name, sku, stock, now);
            importedCount++; 
          }
        }
      }
      stmt.finalize();
      logStmt.finalize(() => resolve({ success: true, count: importedCount }));
    });
  });
});

ipcMain.handle('select-image', async () => { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] }); if(r.canceled) return null; const f = Date.now()+path.basename(r.filePaths[0]); fs.copyFileSync(r.filePaths[0], path.join(uploadsDir, f)); return `asset://${f}`; });
ipcMain.handle('save-base64-image', async (event, { base64Data, filename }) => {
  try {
    const fName = Date.now() + '-' + filename.replace(/\s+/g, '-');
    fs.writeFileSync(path.join(uploadsDir, fName), base64Data.split(';base64,').pop(), { encoding: 'base64' });
    return `asset://${fName}`;
  } catch (e) { return null; }
});

ipcMain.handle('get-products', () => new Promise((res, rej) => db.all("SELECT * FROM products ORDER BY name ASC", [], (e, r) => e ? rej(e) : res(r))));

ipcMain.handle('add-product', (e, p) => new Promise((res, rej) => {
  db.run("INSERT INTO products (name,sku,price,stock,category,image,updated_at) VALUES (?,?,?,?,?,?,?)", [p.name,p.sku,p.price,p.stock,p.category,p.image, new Date().toLocaleString()], function(err) { 
    if(err) return rej(err);
    db.run("INSERT INTO inventory_logs (product_name, sku, action, quantity, date) VALUES (?, ?, 'Created', ?, ?)", [p.name, p.sku, p.stock, new Date().toISOString()]);
    res({id:this.lastID,...p});
  });
}));

ipcMain.handle('update-product', (e, p) => new Promise((res, rej) => db.run("UPDATE products SET name=?, sku=?, price=?, stock=?, category=?, image=?, updated_at=? WHERE id=?", [p.name, p.sku, p.price, p.stock, p.category, p.image, new Date().toLocaleString(), p.id], (err) => err ? rej(err) : res({success:true}))));

ipcMain.handle('delete-product', (e, {id, name, sku}) => new Promise((res, rej) => {
  db.run("DELETE FROM products WHERE id=?", [id], (err) => {
    if(err) return rej(err);
    db.run("INSERT INTO inventory_logs (product_name, sku, action, quantity, date) VALUES (?, ?, 'Deleted', 0, ?)", [name, sku, new Date().toISOString()]);
    res({success:true});
  });
}));

ipcMain.handle('update-stock', (e, {id, newStock, productName, sku, addedAmount}) => new Promise((res, rej) => {
  db.run("UPDATE products SET stock=?, updated_at=? WHERE id=?", [newStock, new Date().toLocaleString(), id], (err) => {
    if(err) return rej(err);
    if(addedAmount) db.run("INSERT INTO inventory_logs (product_name, sku, action, quantity, date) VALUES (?, ?, 'Restock', ?, ?)", [productName, sku, addedAmount, new Date().toISOString()]);
    res({success:true});
  });
}));

ipcMain.handle('get-inventory-logs', () => new Promise((res, rej) => db.all("SELECT * FROM inventory_logs ORDER BY date DESC", [], (e, r) => e ? rej(e) : res(r))));

ipcMain.handle('export-logs-csv', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { title: 'Export Inventory Logs', defaultPath: `Stock_Log_${new Date().toISOString().split('T')[0]}.csv`, filters: [{ name: 'CSV Files', extensions: ['csv'] }] });
  if (canceled || !filePath) return false;
  return new Promise((resolve) => {
    db.all("SELECT * FROM inventory_logs ORDER BY date DESC", [], (err, rows) => {
      if(err) return resolve(false);
      const csvRows = rows.map(r => `"${new Date(r.date).toLocaleString()}","${r.product_name}","${r.sku || ''}","${r.action}",${r.quantity}`).join('\n');
      fs.writeFileSync(filePath, "Date,Product,SKU,Action,Variance\n" + csvRows);
      resolve(true);
    });
  });
});

ipcMain.handle('process-order', (e, { cart, customerId, shiftId, creditUsed, discount, cashHanded, change }) => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.get("SELECT value FROM settings WHERE key='taxRate'", (err, row) => {
      const taxRate = row ? parseFloat(row.value) : 0;
      const tax = taxRate / 100;
      let sub = 0; cart.forEach(i => sub += (i.price*i.quantity)); 
      const preTax = sub + (sub*tax); 
      const finalTotal = Math.max(0, preTax - (discount || 0));
      const invoiceId = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (customerId && creditUsed > 0) db.run("UPDATE customers SET store_credit=store_credit-? WHERE id=?", [creditUsed, customerId]);
      
      db.run("INSERT INTO orders (customer_id, shift_id, invoice_id, total, credit_used, discount, date, status, cash_handed, change, tax_rate) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)", 
        [customerId||null, shiftId, invoiceId, finalTotal, creditUsed||0, discount||0, new Date().toISOString(), cashHanded||0, change||0, taxRate], function(err) {
        if(err) return reject(err); 
        const oId = this.lastID; let c = 0;
        cart.forEach(i => {
          db.run("INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?,?,?,?)", [oId, i.name, i.quantity, i.price]);
          db.run("UPDATE products SET stock=stock-?, updated_at=? WHERE id=?", [i.quantity, new Date().toLocaleString(), i.id], () => { 
            db.run("INSERT INTO inventory_logs (product_name, sku, action, quantity, date) VALUES (?, ?, 'Sale', ?, ?)", [i.name, i.sku, -i.quantity, new Date().toISOString()]);
            c++; if(c===cart.length) resolve({success:true, orderId: oId}); 
          });
        });
      });
    });
  });
}));

ipcMain.handle('refund-order', (event, orderId) => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, order) => {
      if (err || !order || order.status === 'refunded') return reject(new Error("Cannot refund"));
      db.run("UPDATE orders SET status = 'refunded' WHERE id = ?", [orderId]);
      if (order.customer_id && order.credit_used > 0) db.run("UPDATE customers SET store_credit = store_credit + ? WHERE id = ?", [order.credit_used, order.customer_id]);
      
      db.all("SELECT product_name, quantity FROM order_items WHERE order_id = ?", [orderId], (err, items) => {
        if (items) items.forEach(item => {
          db.run("UPDATE products SET stock = stock + ?, updated_at = ? WHERE name = ?", [item.quantity, new Date().toLocaleString(), item.product_name]);
          db.get("SELECT sku FROM products WHERE name = ?", [item.product_name], (err, prod) => {
             db.run("INSERT INTO inventory_logs (product_name, sku, action, quantity, date) VALUES (?, ?, 'Refund Restock', ?, ?)", [item.product_name, prod ? prod.sku : '', item.quantity, new Date().toISOString()]);
          });
        });
        resolve({ success: true });
      });
    });
  });
}));

ipcMain.handle('get-customers', () => new Promise((res, rej) => db.all("SELECT * FROM customers ORDER BY name ASC", [], (e, r) => e ? rej(e) : res(r))));
ipcMain.handle('add-customer', (e, c) => new Promise((res, rej) => db.run("INSERT INTO customers (name,phone,email,store_credit) VALUES (?,?,?,?)", [c.name,c.phone,c.email,c.store_credit||0], function(err){ err ? rej(err) : res({id:this.lastID});})));
ipcMain.handle('update-credit', (e, {id, amount}) => new Promise((res, rej) => db.run("UPDATE customers SET store_credit=store_credit+? WHERE id=?", [amount,id], (err)=> err ? rej(err) : res({success:true}))));
ipcMain.handle('delete-customer', (e, id) => new Promise((res, rej) => db.run("DELETE FROM customers WHERE id=?", [id], (err)=> err ? rej(err) : res({success:true}))));

ipcMain.handle('get-transactions', () => new Promise((resolve, reject) => {
  const query = `
    SELECT orders.*, 
           customers.name as customer_name,
           users.name as cashier_name
    FROM orders 
    LEFT JOIN customers ON orders.customer_id = customers.id 
    LEFT JOIN shifts ON orders.shift_id = shifts.id
    LEFT JOIN users ON shifts.user_id = users.id
    ORDER BY orders.date DESC
  `;
  db.all(query, [], (err, orders) => {
    if (err) return reject(err);
    if (!orders) return resolve([]);
    db.all("SELECT * FROM order_items", [], (err, items) => {
      if (err) return reject(err);
      resolve(orders.map(o => ({ ...o, items: items.filter(i => i.order_id === o.id) })));
    });
  });
}));

ipcMain.handle('get-dashboard-stats', () => new Promise((res, rej) => { 
  db.serialize(() => {
    const stats = { revenue: 0, salesCount: 0, chart7Days: [], chart30Days: [], categoryData: [], lowStock: [], topProducts: [], totalCredit: 0, cashierData: [] };
    
    db.get(`SELECT SUM(total - credit_used) as revenue, COUNT(id) as count FROM orders WHERE status = 'completed' AND date >= date('now', 'localtime', '-29 days')`, [], (err, row) => {
      if (!err && row) { stats.revenue = row.revenue || 0; stats.salesCount = row.count || 0; }
        
      db.all("SELECT date(date, 'localtime') as label, SUM(total - credit_used) as total FROM orders WHERE status = 'completed' AND date >= date('now', 'localtime', '-6 days') GROUP BY label ORDER BY label ASC", [], (err, rows7) => {
        let series7 = [];
        for(let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i); const offset = d.getTimezoneOffset() * 60000; const localISO = (new Date(d.getTime() - offset)).toISOString().split('T')[0];
          const found = (rows7 || []).find(x => x.label === localISO); series7.push({ date: localISO, total: found ? found.total : 0 });
        }
        stats.chart7Days = series7;

        db.all("SELECT date(date, 'localtime') as label, SUM(total - credit_used) as total FROM orders WHERE status = 'completed' AND date >= date('now', 'localtime', '-29 days') GROUP BY label ORDER BY label ASC", [], (err, rows30) => {
          let series30 = [];
          for(let i = 29; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i); const offset = d.getTimezoneOffset() * 60000; const localISO = (new Date(d.getTime() - offset)).toISOString().split('T')[0];
            const found = (rows30 || []).find(x => x.label === localISO); series30.push({ date: localISO, total: found ? found.total : 0 });
          }
          stats.chart30Days = series30;
          
          db.all(`SELECT u.name as cashier, date(o.date, 'localtime') as label, SUM(o.total - o.credit_used) as daily_total FROM orders o JOIN shifts s ON o.shift_id = s.id JOIN users u ON s.user_id = u.id WHERE o.status = 'completed' AND o.date >= date('now', 'localtime', '-6 days') GROUP BY u.id, label`, [], (err, cashRows) => {
            const last7Days = series7.map(s => s.date);
            const cashierMap = {};
            if (cashRows) {
              cashRows.forEach(r => {
                if (!cashierMap[r.cashier]) cashierMap[r.cashier] = { name: r.cashier, total: 0, series: Array(7).fill(0) };
                const dayIdx = last7Days.indexOf(r.label);
                if (dayIdx !== -1) {
                  cashierMap[r.cashier].series[dayIdx] = r.daily_total;
                  cashierMap[r.cashier].total += r.daily_total;
                }
              });
            }
            stats.cashierData = Object.values(cashierMap).sort((a,b) => b.total - a.total);

            db.all("SELECT id, name, sku, stock, image FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 8", [], (err, lowRows) => {
              if (!err && lowRows) stats.lowStock = lowRows;
              db.all(`SELECT order_items.product_name, SUM(order_items.quantity) as sold FROM order_items JOIN orders ON order_items.order_id = orders.id WHERE orders.status = 'completed' AND orders.date >= date('now', 'localtime', '-29 days') GROUP BY order_items.product_name ORDER BY sold DESC LIMIT 5`, [], (err, topRows) => {
                if (!err && topRows) stats.topProducts = topRows;
                db.all(`SELECT p.category as name, SUM(oi.quantity * oi.price) as total FROM order_items oi JOIN products p ON oi.product_name = p.name JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed' AND o.date >= date('now', 'localtime', '-29 days') GROUP BY p.category ORDER BY total DESC`, [], (err, catRows) => {
                  if (!err && catRows) stats.categoryData = catRows;
                  db.get("SELECT SUM(store_credit) as tc FROM customers", [], (err, credRow) => {
                    if (!err && credRow) stats.totalCredit = credRow.tc || 0;
                    res(stats);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}));

ipcMain.handle('get-categories', () => new Promise((res, rej) => db.all("SELECT * FROM categories", [], (e, r) => e ? rej(e) : res(r))));
ipcMain.handle('add-category', (e, n) => new Promise((res, rej) => db.run("INSERT INTO categories (name) VALUES (?)", [n], function(err){ err ? rej(err) : res({id:this.lastID});})));
ipcMain.handle('delete-category', (e, id) => new Promise((res, rej) => db.run("DELETE FROM categories WHERE id=?", [id], (err)=> err ? rej(err) : res({success:true}))));
ipcMain.handle('get-settings', () => new Promise((res, rej) => db.all("SELECT * FROM settings", [], (e, r) => e ? rej(e) : res(r))));
ipcMain.handle('update-setting', (e, {key, value}) => new Promise((res, rej) => db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?", [key, value, value], (err)=> err ? rej(err) : res({success:true}))));
ipcMain.handle('login', (e, {username, password}) => new Promise((res, rej) => db.get("SELECT * FROM users WHERE username=? AND password=?", [username, password], (err, u) => err ? rej(err) : res(u||null))));
ipcMain.handle('get-users', () => new Promise((res, rej) => db.all("SELECT * FROM users", [], (e, r) => e ? rej(e) : res(r))));
ipcMain.handle('add-user', (e, u) => new Promise((res, rej) => db.run("INSERT INTO users (name,username,password,role,image) VALUES (?,?,?,?,?)", [u.name,u.username,u.password,u.role,u.image||''], function(err){ err ? rej(err) : res({id:this.lastID});})));
ipcMain.handle('update-user', (e, u) => new Promise((res, rej) => db.run("UPDATE users SET name=?, username=?, password=?, role=?, image=? WHERE id=?", [u.name, u.username, u.password, u.role, u.image||'', u.id], (err)=> err ? rej(err) : res({success:true}))));
ipcMain.handle('delete-user', (e, id) => new Promise((res, rej) => db.run("DELETE FROM users WHERE id=?", [id], (err)=> err ? rej(err) : res({success:true}))));
    
ipcMain.handle('manual-backup', async () => { const d = path.join(backupDir, `manual_backup_${Date.now()}.db`); fs.copyFileSync(dbPath, d); return d; });
    
ipcMain.handle('export-csv', async (event, transactions) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { title: 'Export Sales Data', defaultPath: `Sales_Export_${new Date().toISOString().split('T')[0]}.csv`, filters: [{ name: 'CSV Files', extensions: ['csv'] }] });
  if (canceled || !filePath) return false;
  const rows = transactions.map(t => {
    const itemsCount = t.items ? t.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    return `${t.invoice_id},"${new Date(t.date).toLocaleString()}",${itemsCount},${((t.total || 0) - (t.credit_used || 0)).toFixed(2)},${t.status}`;
  }).join('\n');
  fs.writeFileSync(filePath, "Invoice ID,Date,Total Items,Amount Paid,Status\n" + rows);
  return true;
});

ipcMain.handle('print-receipt', async (event, { order, settings }) => {
  return new Promise(async (resolve) => {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    const currency = settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency === 'PHP' ? '₱' : '$';
    
    let itemsHtml = order.items.map(i => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
         <span style="flex: 1; padding-right: 10px;">${i.quantity}x ${i.product_name} <br><small style="color:#555;">@ ${currency}${(i.price).toFixed(2)}/ea</small></span>
         <span>${currency}${(i.price * i.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    let subtotal = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    let taxRate = order.tax_rate !== undefined ? order.tax_rate : (settings.taxRate || 0);
    let taxAmount = subtotal * (taxRate / 100);
    let grandTotal = (order.total || 0);
    let amountPaid = grandTotal - (order.credit_used || 0);
    
    let subHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px;"><span>Subtotal:</span><span>${currency}${subtotal.toFixed(2)}</span></div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;"><span>VAT (${taxRate}%):</span><span>${currency}${taxAmount.toFixed(2)}</span></div>
    `;
    if (order.discount > 0) subHtml += `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;"><span>Discount:</span><span>-${currency}${order.discount.toFixed(2)}</span></div>`;
    if (order.credit_used > 0) subHtml += `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;"><span>Credit Used:</span><span>-${currency}${order.credit_used.toFixed(2)}</span></div>`;
    
    let paymentHtml = '';
    if (order.cash_handed > 0) {
       paymentHtml = `
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px;"><span>Cash Handed:</span><span>${currency}${(order.cash_handed).toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;"><span>Change:</span><span>${currency}${(order.change).toFixed(2)}</span></div>
       `;
    }

    let refundBanner = order.status === 'refunded' ? `<div style="text-align:center; font-weight:bold; font-size: 16px; border: 2px dashed #000; padding: 5px; margin-bottom: 10px;">*** REFUNDED ***</div>` : '';
    
    const html = `
      <html>
        <head>
          <style>
            body { font-family: monospace; color: #000; margin: 0; padding: 10px; width: 280px; }
            .hdr { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .hdr h2 { margin: 0 0 5px 0; font-size: 18px; }
            .hdr p { margin: 2px 0; font-size: 12px; }
            .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px; }
            .total { font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 8px; margin-top: 5px; display: flex; justify-content: space-between; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="hdr">
            <h2>${settings.storeName || 'Store Receipt'}</h2>
            ${settings.storeAddress ? `<p>${settings.storeAddress}</p>` : ''}
            ${settings.storePhone ? `<p>${settings.storePhone}</p>` : ''}
            ${settings.vatNumber ? `<p>VAT REG TIN: ${settings.vatNumber}</p>` : ''}
            <p>Invoice: ${order.invoice_id}</p>
            <p>${new Date(order.date).toLocaleString()}</p>
            ${order.cashier_name ? `<p>Cashier: ${order.cashier_name}</p>` : ''}
            ${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ''}
          </div>
          ${refundBanner}
          <div style="margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
            ${itemsHtml}
          </div>
          ${subHtml}
          <div class="total">
            <span>GRAND TOTAL:</span>
            <span>${currency}${amountPaid.toFixed(2)}</span>
          </div>
          ${paymentHtml}
          <div class="footer">
            <p>${settings.receiptFooter || 'Thank you for your purchase!'}</p>
          </div>
        </body>
      </html>
    `;
    
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    printWin.webContents.print({ silent: false, printBackground: true }, async (success) => { 
      if (!success) {
        try {
          const pdfData = await printWin.webContents.printToPDF({ printBackground: true });
          const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Receipt as PDF',
            defaultPath: `Receipt_${order.invoice_id}.pdf`,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
          });
          if (filePath) { fs.writeFileSync(filePath, pdfData); resolve(true); } else { resolve(false); }
        } catch (error) { resolve(false); } finally { printWin.close(); }
      } else {
        setTimeout(() => { printWin.close(); resolve(true); }, 1000); 
      }
    });
  });
});

ipcMain.handle('print-barcodes', async (event, { product, quantity, settings }) => {
  return new Promise(async (resolve) => {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    let labelsHtml = '';
    for(let i = 0; i < quantity; i++) {
       labelsHtml += `
         <div style="width: 1.5in; height: 1in; margin: 0.1in; border: 1px dashed #ccc; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 2px;">
           <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${product.sku}&scale=2&includetext" style="max-width: 90%; max-height: 70%;" />
           <span style="font-size: 8px; margin-top: 2px; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: sans-serif;">${product.name}</span>
         </div>
       `;
    }
    const html = `<html><head><style>@page { size: letter; margin: 0.5in; } body { font-family: sans-serif; margin: 0; padding: 0; text-align: left; }</style></head><body><h2 style="font-size: 14px; margin-bottom: 10px;">Barcode Print Job - ${product.name} (x${quantity})</h2><div style="display: flex; flex-wrap: wrap;">${labelsHtml}</div></body></html>`;
    
    try {
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const pdfData = await printWin.webContents.printToPDF({ printBackground: true });
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Barcodes as PDF',
        defaultPath: `${product.sku}_barcodes.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });
      if (filePath) { fs.writeFileSync(filePath, pdfData); resolve(true); } else { resolve(false); }
    } catch (error) { resolve(false); } finally { printWin.close(); }
  });
});