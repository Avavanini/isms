import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LowStockBanner } from '../components/LowStockBanner.jsx';
import { Sidebar } from '../components/Sidebar.jsx';

describe('Developer 2 Frontend Components', () => {
  it('renders LowStockBanner with warning and quick auto-reorder trigger', () => {
    const mockAlerts = [
      {
        item_id: 1,
        sku: 'MCU-ESP32-S3',
        item_name: 'ESP32-S3 Module',
        warehouse_name: 'Central Hub',
        current_stock: 45,
        minimum_stock_level: 150,
        suggested_reorder: 180,
        severity: 'CRITICAL'
      }
    ];

    render(
      <LowStockBanner alerts={mockAlerts} onReordersTriggered={() => {}} />
    );

    expect(screen.getByText(/Automated Reorder Alert: 1 Item Below Minimum Stock Threshold!/i)).toBeInTheDocument();
    expect(screen.getByText(/⚡ Generate Auto-Reorders/i)).toBeInTheDocument();
  });

  it('renders Sidebar with Developer 2 navigation modules', () => {
    render(
      <BrowserRouter>
        <Sidebar alertCount={3} />
      </BrowserRouter>
    );

    expect(screen.getByText(/ISMS Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Purchase Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Stock Transfers/i)).toBeInTheDocument();
    expect(screen.getByText(/Suppliers/i)).toBeInTheDocument();
    expect(screen.getByText(/FSN & Analytics/i)).toBeInTheDocument();
  });
});
