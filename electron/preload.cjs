const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  updateStock: (data) => ipcRenderer.invoke('update-stock', data),
  
  // UPDATED: Now takes an object with customer info
  processOrder: (data) => ipcRenderer.invoke('process-order', data),
  selectImage: () => ipcRenderer.invoke('select-image'),
  getDashboardStats: (range) => ipcRenderer.invoke('get-dashboard-stats', range),
  getTransactions: () => ipcRenderer.invoke('get-transactions'),
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (name) => ipcRenderer.invoke('add-category', name),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (data) => ipcRenderer.invoke('update-setting', data),
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (user) => ipcRenderer.invoke('add-user', user),
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id),
  exportCsv: (transactions) => ipcRenderer.invoke('export-csv', transactions),
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),

  // NEW: Customers & Backups
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  addCustomer: (data) => ipcRenderer.invoke('add-customer', data),
  updateCredit: (data) => ipcRenderer.invoke('update-credit', data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
  manualBackup: () => ipcRenderer.invoke('manual-backup')
});