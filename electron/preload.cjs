const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  updateStock: (data) => ipcRenderer.invoke('update-stock', data),
  processOrder: (cart) => ipcRenderer.invoke('process-order', cart),
  selectImage: () => ipcRenderer.invoke('select-image'),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats')
});