import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  const [monthWiseData, setMonthWiseData] = useState({});

  // Search Debounce Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on new search
      setInvoices([]); // Clear existing list
      setHasMore(true);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load invoices and summary from Backend
  useEffect(() => {
    fetchInvoices(page, debouncedSearch);
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchInvoices = async (currentPage, search) => {
    if (isLoading || !hasMore && currentPage > 1) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/invoices?page=${currentPage}&limit=20&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setTotalCount(data.totalCount);

        if (currentPage === 1) {
          setInvoices(data.invoices);
        } else {
          setInvoices(prev => [...prev, ...data.invoices]);
        }

        if (currentPage >= data.totalPages) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices/summary`);
      if (res.ok) {
        const data = await res.json();
        setMonthWiseData(data);
      }
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
  };

  // --- Derived data (Memoized) ---
  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [invoices]);

  // --- Actions ---
  const [selectedMonth, setSelectedMonth] = useState(null);

  const handleMonthClick = useCallback((monthKey) => {
    setSelectedMonth(prev => prev === monthKey ? null : monthKey);
  }, []);

  const handleCreateBill = useCallback(() => {
    localStorage.removeItem('editInvoiceId');
    navigate('/create');
  }, [navigate]);

  const handleEdit = useCallback((invoice) => {
    localStorage.setItem('editInvoiceId', invoice._id);
    navigate('/create');
  }, [navigate]);

  const handleViewInvoice = useCallback((invoice) => {
    localStorage.setItem('editInvoiceId', invoice._id);
    navigate('/invoice');
  }, [navigate]);

  const confirmDelete = useCallback((invoice) => {
    setDeleteTarget(invoice);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`${API_BASE}/invoices/${deleteTarget._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setInvoices(prev => prev.filter(inv => inv._id !== deleteTarget._id));
        fetchSummary();
        setDeleteTarget(null);
        setTotalCount(prev => Math.max(0, prev - 1));
      } else {
        alert("Failed to delete invoice");
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("Error connecting to server");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Virtualized Row Component
  const Row = useCallback(({ index, style }) => {
    const invoice = invoices[index];
    if (!invoice) return null; // Fallback

    return (
      <div style={style} key={invoice._id}>
        {/* Wrap in inner div to apply margin/padding without breaking react-window height calculations */}
        <div style={{ padding: '0 8px', height: '100%', boxSizing: 'border-box' }}>
          <div className="invoice-card" style={{ height: 'calc(100% - 14px)', margin: '0 0 14px 0' }}>
            <div className="invoice-card-header">
              <span className="invoice-number">#{invoice.invoiceNumber || 'N/A'}</span>
              <span className="invoice-date">{formatDate(invoice.invoiceDate)}</span>
            </div>

            <div className="invoice-card-body">
              <span className="customer-name">{invoice.customerName || 'Unknown Customer'}</span>
              <span className="invoice-amount">
                <span className="invoice-amount-currency">₹</span>
                {formatCurrency(invoice.grandTotal)}
              </span>
              {invoice.paymentStatus && (
                <span className={`payment-status status-${invoice.paymentStatus.toLowerCase()}`}>
                  {invoice.paymentStatus}
                </span>
              )}
            </div>

            <div className="invoice-items-summary">
              {invoice.itemCount} item{invoice.itemCount > 1 ? 's' : ''}
              {invoice.itemsSummary && invoice.itemsSummary.length > 0 && (
                <span> &bull; {invoice.itemsSummary.map(i => i.description).join(', ')}{invoice.itemCount > 3 ? '...' : ''}</span>
              )}
            </div>

            <div className="invoice-actions">
              <button
                className="action-btn action-btn-view"
                onClick={() => handleViewInvoice(invoice)}
                title="View Invoice"
              >
                <span className="action-icon">👁</span> View
              </button>
              <button
                className="action-btn action-btn-edit"
                onClick={() => handleEdit(invoice)}
                title="Edit Invoice"
              >
                <span className="action-icon">✏️</span> Edit
              </button>
              <button
                className="action-btn action-btn-delete"
                onClick={() => confirmDelete(invoice)}
                title="Delete Invoice"
              >
                <span className="action-icon">🗑</span> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [invoices, handleViewInvoice, handleEdit, confirmDelete]);


  return (
    <div className="dashboard-wrapper">
      {/* ===== Header ===== */}
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="header-brand">
            <h1 className="header-title">MEENA TRADERS</h1>
            <p className="header-subtitle">Yarn &amp; Warp Traders</p>
          </div>
          <button className="create-bill-btn" onClick={handleCreateBill} id="create-bill-btn">
            <span className="create-bill-icon">+</span>
            Create Bill
          </button>
        </div>
      </header>

      {/* ===== Stats Bar ===== */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Total Bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{invoices.length}</div>
          <div className="stat-label">Loaded</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: invoices.length > 0 ? '1.1rem' : undefined }}>
            ₹{formatCurrency(totalRevenue)}
          </div>
          <div className="stat-label">Revenue (Loaded)</div>
        </div>
      </div>

      {/* ===== Content ===== */}
      <div className="dashboard-content">
        {/* ===== GST Summary Section ===== */}
        {Object.keys(monthWiseData).length > 0 && (
          <div className="gst-summary-section">
            <h2 className="section-title">
              <span className="section-title-icon">💰</span>
              GST Summary
            </h2>
            <div className="gst-month-cards">
              {Object.entries(monthWiseData).map(([monthKey, data]) => (
                <div
                  key={monthKey}
                  className={`gst-month-card ${selectedMonth === monthKey ? 'expanded' : ''}`}
                  onClick={() => handleMonthClick(monthKey)}
                >
                  <div className="gst-month-header">
                    <span className="gst-month-name">{data.label}</span>
                    <span className="gst-month-count">{data.count} Bills</span>
                  </div>

                  <div className="gst-month-body">
                    <div className="gst-month-row">
                      <span>Subtotal</span>
                      <span>₹{formatCurrency(data.subtotal)}</span>
                    </div>
                    <div className="gst-month-row">
                      <span>CGST Total</span>
                      <span>₹{formatCurrency(data.cgst)}</span>
                    </div>
                    <div className="gst-month-row">
                      <span>SGST Total</span>
                      <span>₹{formatCurrency(data.sgst)}</span>
                    </div>
                    <div className="gst-month-row gst-month-tax-total">
                      <span>Total Tax</span>
                      <span>₹{formatCurrency(data.totalTax)}</span>
                    </div>
                    <div className="gst-month-row gst-month-total">
                      <span>Grand Total</span>
                      <span>₹{formatCurrency(data.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Search */}
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by invoice number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="search-invoices"
          />
        </div>

        <h2 className="section-title">
          <span className="section-title-icon">📄</span>
          Recent Invoices
        </h2>


        {invoices.length === 0 && !isLoading ? (
          /* ----- Empty State ----- */
          <div className="empty-state">
            <div className="empty-state-icon">{searchTerm ? '🔍' : '📋'}</div>
            <h3 className="empty-state-title">{searchTerm ? 'No results found' : 'No invoices yet'}</h3>
            <p className="empty-state-text">
              {searchTerm ? 'Try a different search term.' : <>Create your first GST invoice to get started.<br />All your bills will appear here.</>}
            </p>
            {!searchTerm && (
              <button className="empty-state-btn" onClick={handleCreateBill}>
                <span>+</span> Create Your First Bill
              </button>
            )}
          </div>
        ) : (
          /* ----- Virtualized Invoice List ----- */
          <div className="invoice-list-container" style={{ width: '100%', height: 'calc(100vh - 250px)', minHeight: '500px' }}>
            <List
              height={600} // Fixed height or you can use AutoSizer for full responsiveness
              itemCount={invoices.length}
              itemSize={180} // Estimated height of the card including margin
              width="100%"
              className="virtualized-list"
            >
              {Row}
            </List>

            {hasMore && (
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <button
                  className="create-bill-btn"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={isLoading}
                  style={{ background: 'var(--text-secondary)' }}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteTarget && (
        <div className="delete-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">⚠️</div>
            <h3 className="delete-modal-title">Delete Invoice?</h3>
            <p className="delete-modal-text">
              Invoice <strong>#{deleteTarget.invoiceNumber}</strong> for{' '}
              <strong>{deleteTarget.customerName}</strong> will be permanently removed.
            </p>
            <div className="delete-modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="modal-btn modal-btn-delete" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
