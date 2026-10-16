import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Unable to connect to the server'
    };
    return Promise.reject(errorData);
  }
);

// Module 3: Procurement, Reorders & Suppliers
export const supplierService = {
  getSuppliers: (params) => apiClient.get('/suppliers', { params }),
  getSupplier: (id) => apiClient.get(`/suppliers/${id}`),
  createSupplier: (data) => apiClient.post('/suppliers', data),
  updateSupplier: (id, data) => apiClient.patch(`/suppliers/${id}`, data),
  deleteSupplier: (id) => apiClient.delete(`/suppliers/${id}`)
};

export const purchaseOrderService = {
  getPurchaseOrders: (params) => apiClient.get('/purchase-orders', { params }),
  getPurchaseOrder: (id) => apiClient.get(`/purchase-orders/${id}`),
  createPurchaseOrder: (data) => apiClient.post('/purchase-orders', data),
  approvePurchaseOrder: (id) => apiClient.post(`/purchase-orders/${id}/approve`),
  receivePurchaseOrder: (id) => apiClient.post(`/purchase-orders/${id}/receive`),
  cancelPurchaseOrder: (id) => apiClient.post(`/purchase-orders/${id}/cancel`),
  getLowStockAlerts: () => apiClient.get('/alerts/low-stock'),
  triggerReorders: () => apiClient.post('/alerts/trigger-reorders')
};

// Module 4: Inter-Warehouse Transfers & Analytics
export const transferService = {
  getTransfers: (params) => apiClient.get('/transfers', { params }),
  getTransfer: (id) => apiClient.get(`/transfers/${id}`),
  createTransfer: (data) => apiClient.post('/transfers', data),
  approveTransfer: (id) => apiClient.post(`/transfers/${id}/approve`),
  dispatchTransfer: (id) => apiClient.post(`/transfers/${id}/dispatch`),
  receiveTransfer: (id) => apiClient.post(`/transfers/${id}/receive`),
  cancelTransfer: (id) => apiClient.post(`/transfers/${id}/cancel`)
};

export const analyticsService = {
  getMetrics: () => apiClient.get('/analytics/metrics'),
  getFsnAnalysis: () => apiClient.get('/analytics/fsn'),
  getStockAuditReport: () => apiClient.get('/analytics/reports/stock-audit'),
  getExportCsvUrl: () => `${API_BASE_URL}/analytics/reports/export-csv`
};

// Inventory & Warehouse master data
export const inventoryService = {
  getWarehouses: () => apiClient.get('/warehouses'),
  getItems: (params) => apiClient.get('/items', { params }),
  getStockLevels: (params) => apiClient.get('/stock/levels', { params }),
  getCategories: () => apiClient.get('/categories')
};
