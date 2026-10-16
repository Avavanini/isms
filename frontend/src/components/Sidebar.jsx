import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  ArrowLeftRight,
  Truck,
  BarChart3,
  Boxes,
  ShieldCheck
} from 'lucide-react';

export function Sidebar({ alertCount = 0 }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <Boxes size={22} />
        </div>
        <div className="sidebar-brand-text">
          <h1>ISMS Portal</h1>
          <span>Enterprise Logistics</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Core Operations</div>
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <div className="nav-section-title">Developer 2 Modules</div>
        <NavLink to="/purchase-orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={18} />
          <span>Purchase Orders</span>
          {alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
        </NavLink>

        <NavLink to="/stock-transfers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ArrowLeftRight size={18} />
          <span>Stock Transfers</span>
        </NavLink>

        <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Truck size={18} />
          <span>Suppliers</span>
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} />
          <span>FSN & Analytics</span>
        </NavLink>

        <div className="nav-section-title">Warehouse Master</div>
        <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Boxes size={18} />
          <span>Inventory Catalog</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">
          <ShieldCheck size={18} />
        </div>
        <div className="user-info">
          <div className="user-name">Developer 2 Session</div>
          <div className="user-role">Role: ADMIN / LOGISTICS</div>
        </div>
      </div>
    </aside>
  );
}
