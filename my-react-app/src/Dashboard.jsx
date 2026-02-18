import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);


  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  const [monthWiseData, setMonthWiseData] = useState({});

  // Load invoices and summary from Backend on mount
  useEffect(() => {
    fetchInvoices();
    fetchSummary();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed to fetch invoices", err);
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

  // --- Derived data ---
  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return (
      (inv.invoiceNumber || '').toLowerCase().includes(term) ||
      (inv.customerName || '').toLowerCase().includes(term)
    );
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  // Month wise data is now fetched from API (fetchSummary)
  // No need to calculate client-side anymore.

  // --- Actions ---
  const [selectedMonth, setSelectedMonth] = useState(null);

  const handleMonthClick = (monthKey) => {
    setSelectedMonth(prev => prev === monthKey ? null : monthKey);
  };

  // --- Actions ---
  const handleCreateBill = () => {
    // Clear any previous edit context
    localStorage.removeItem('editInvoiceId');
    navigate('/create');
  };

  const handleEdit = (invoice) => {
    // Store the invoice ID so the form knows to load it
    localStorage.setItem('editInvoiceId', invoice._id);
    // Also store the data so the form can pre-fill
    localStorage.setItem('invoiceData', JSON.stringify(invoice));
    navigate('/create');
  };

  const handleViewInvoice = (invoice) => {
    localStorage.setItem('invoiceData', JSON.stringify(invoice));
    navigate('/invoice');
  };

  const confirmDelete = (invoice) => {
    setDeleteTarget(invoice);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`${API_BASE}/invoices/${deleteTarget._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Update local state
        setInvoices(prev => prev.filter(inv => inv._id !== deleteTarget._id));
        // Refresh summary as well
        fetchSummary();
        setDeleteTarget(null);
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
          <div className="stat-value">{invoices.length}</div>
          <div className="stat-label">Total Bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{filteredInvoices.length}</div>
          <div className="stat-label">Showing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: invoices.length > 0 ? '1.1rem' : undefined }}>
            ₹{formatCurrency(totalRevenue)}
          </div>
          <div className="stat-label">Revenue</div>
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

                  {/* Expanded Invoices List */}
                  {selectedMonth === monthKey && (
                    <div className="gst-month-invoices" onClick={(e) => e.stopPropagation()}>
                      <div className="gst-month-invoices-header">Invoices in {data.label}</div>
                      {data.invoices.map(inv => (
                        <div key={inv.id} className="gst-mini-invoice-row" onClick={() => handleViewInvoice(inv)}>
                          <span className="gst-mini-inv-num">#{inv.invoiceNumber}</span>
                          <span className="gst-mini-inv-date">{new Date(inv.invoiceDate).getDate()}th</span>
                          <span className="gst-mini-inv-name">{inv.customerName}</span>
                          <span className="gst-mini-inv-amount">₹{formatCurrency(inv.grandTotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {invoices.length > 0 && (
          <>
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
          </>
        )}

        {invoices.length === 0 ? (
          /* ----- Empty State ----- */
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">No invoices yet</h3>
            <p className="empty-state-text">
              Create your first GST invoice to get started.<br />
              All your bills will appear here.
            </p>
            <button className="empty-state-btn" onClick={handleCreateBill}>
              <span>+</span> Create Your First Bill
            </button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          /* ----- No Search Results ----- */
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">No results found</h3>
            <p className="empty-state-text">
              Try a different search term.
            </p>
          </div>
        ) : (
          /* ----- Invoice List ----- */
          <div className="invoice-list">
            {filteredInvoices.map((invoice) => (
              <div className="invoice-card" key={invoice._id}>
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
                </div>

                {invoice.items && invoice.items.length > 0 && (
                  <div className="invoice-items-summary">
                    {invoice.items.length} item{invoice.items.length > 1 ? 's' : ''} •{' '}
                    {invoice.items
                      .map((it) => it.description)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(', ')}
                    {invoice.items.length > 3 ? '...' : ''}
                  </div>
                )}

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
            ))}
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
