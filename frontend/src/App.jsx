import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.jsx';
import { Navbar } from './components/Navbar.jsx';
import { LowStockBanner } from './components/LowStockBanner.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { PurchaseOrders } from './pages/PurchaseOrders.jsx';
import { StockTransfers } from './pages/StockTransfers.jsx';
import { Suppliers } from './pages/Suppliers.jsx';
import { Analytics } from './pages/Analytics.jsx';
import { InventoryCatalog } from './pages/InventoryCatalog.jsx';
import { purchaseOrderService } from './services/api.js';
import { useWebSocket } from './context/WebSocketContext.jsx';

export function App() {
  const [alerts, setAlerts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);

  const { lastEvent } = useWebSocket();

  const loadAlerts = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await purchaseOrderService.getLowStockAlerts();
      if (res?.data) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.warn('Alerts load error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts, lastEvent]);

  return (
    <div className="app-container">
      <Sidebar alertCount={alerts.length} />

      <div className="main-wrapper">
        <Navbar
          onRefresh={loadAlerts}
          isRefreshing={isRefreshing}
          alertCount={alerts.length}
        />

        <main style={{ flex: 1, padding: '1.5rem 1.75rem' }}>
          <LowStockBanner
            alerts={alerts}
            onReordersTriggered={() => {
              loadAlerts();
            }}
          />

          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  onOpenCreatePO={() => setIsCreatePoOpen(true)}
                  onOpenCreateTransfer={() => setIsCreateTransferOpen(true)}
                />
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <PurchaseOrders
                  isCreateModalOpen={isCreatePoOpen}
                  setIsCreateModalOpen={setIsCreatePoOpen}
                />
              }
            />
            <Route
              path="/stock-transfers"
              element={
                <StockTransfers
                  isCreateModalOpen={isCreateTransferOpen}
                  setIsCreateModalOpen={setIsCreateTransferOpen}
                />
              }
            />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/inventory" element={<InventoryCatalog />} />
          </Routes>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
