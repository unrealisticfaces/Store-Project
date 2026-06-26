const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { bypassCSP: true, standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const dbPath = path.join(__dirname, 'store.db');
const db = new sqlite3.Database(dbPath);

const uploadsDir = path.join(app.getPath('userData'), 'StoreManagerUploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      sku TEXT UNIQUE,
      price REAL,
      stock INTEGER,
      category TEXT,
      image TEXT
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL,
      date TEXT
    )
  `);
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
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

      return new Response(data, {
        headers: {
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*' 
        }
      });
    } catch (error) {
      return new Response(null, { status: 404 });
    }
  });
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
  });

  if (result.canceled) return null;

  const sourcePath = result.filePaths[0];
  const fileName = Date.now() + '-' + path.basename(sourcePath).replace(/\s+/g, '-');
  const destPath = path.join(uploadsDir, fileName);

  fs.copyFileSync(sourcePath, destPath);
  return `asset://${fileName}`;
});

ipcMain.handle('get-products', () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

ipcMain.handle('add-product', (event, product) => {
  return new Promise((resolve, reject) => {
    const { name, sku, price, stock, category, image } = product;
    db.run(
      "INSERT INTO products (name, sku, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?)",
      [name, sku, price, stock, category, image],
      function(err) {
        if (err) reject(err);
        resolve({ id: this.lastID, ...product });
      }
    );
  });
});

ipcMain.handle('delete-product', (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM products WHERE id = ?", [id], function(err) {
      if (err) reject(err);
      resolve({ success: true, changes: this.changes });
    });
  });
});

ipcMain.handle('update-stock', (event, { id, newStock }) => {
  return new Promise((resolve, reject) => {
    db.run("UPDATE products SET stock = ? WHERE id = ?", [newStock, id], function(err) {
      if (err) reject(err);
      resolve({ success: true, changes: this.changes });
    });
  });
});

ipcMain.handle('process-order', (event, cart) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let total = 0;
      cart.forEach(item => total += (item.price * item.quantity));

      db.run("INSERT INTO orders (total, date) VALUES (?, ?)", [total, new Date().toISOString()], function(err) {
        if (err) return reject(err);
        
        let completed = 0;
        cart.forEach(item => {
          db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id], (err) => {
            completed++;
            if (completed === cart.length) {
              resolve({ success: true });
            }
          });
        });
      });
    });
  });
});

ipcMain.handle('get-dashboard-stats', () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const stats = {
        revenue: 0,
        salesCount: 0,
        recentSales: [],
        chartData: []
      };

      db.get("SELECT SUM(total) as revenue, COUNT(id) as count FROM orders", [], (err, row) => {
        if (!err && row) {
          stats.revenue = row.revenue || 0;
          stats.salesCount = row.count || 0;
        }

        db.all("SELECT id, total, date FROM orders ORDER BY date DESC LIMIT 5", [], (err, rows) => {
          if (!err && rows) {
            stats.recentSales = rows;
          }

          db.all("SELECT strftime('%m', date) as month, SUM(total) as total FROM orders GROUP BY month ORDER BY month ASC LIMIT 12", [], (err, chartRows) => {
            if (!err && chartRows) {
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              stats.chartData = chartRows.map(row => ({
                name: monthNames[parseInt(row.month, 10) - 1],
                total: row.total
              }));
            }
            resolve(stats);
          });
        });
      });
    });
  });
});