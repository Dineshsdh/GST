import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Payment status edit modal
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [newStatus, setNewStatus] = useState('Unpaid');

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  const [monthWiseData, setMonthWiseData] = useState({});

  // Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
      setInvoices([]);
      setHasMore(true);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchInvoices(page, debouncedSearch);
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchInvoices = async (currentPage, search) => {
    if (isLoading || (!hasMore && currentPage > 1)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/invoices?page=${currentPage}&limit=20&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setTotalCount(data.totalCount || 0);
        if (currentPage === 1) {
          setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
        } else {
          setInvoices(prev => [...prev, ...(Array.isArray(data.invoices) ? data.invoices : [])]);
        }
        if (currentPage >= (data.totalPages || 0)) setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices/summary`);
      if (res.ok) setMonthWiseData(await res.json());
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
  };

  const totalRevenue = useMemo(() =>
    invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
    [invoices]);

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
      const res = await fetch(`${API_BASE}/invoices/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvoices(prev => Array.isArray(prev) ? prev.filter(inv => inv._id !== deleteTarget._id) : []);
        fetchSummary();
        setDeleteTarget(null);
        setTotalCount(prev => Math.max(0, prev - 1));
      } else {
        alert('Failed to delete invoice');
      }
    } catch (err) {
      console.error('Delete error', err);
      alert('Error connecting to server');
    }
  };

  // Open payment status editor
  const openPaymentModal = useCallback((invoice) => {
    setPaymentTarget(invoice);
    setNewStatus(invoice.paymentStatus || 'Unpaid');
    setPaidAmount(invoice.paidAmount || '');
  }, []);

  // Save payment status
  const savePaymentStatus = async () => {
    if (!paymentTarget) return;
    try {
      const body = { paymentStatus: newStatus };
      if (newStatus === 'Partial') body.paidAmount = parseFloat(paidAmount) || 0;
      const res = await fetch(`${API_BASE}/invoices/${paymentTarget._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoices(prev =>
          Array.isArray(prev)
            ? prev.map(inv => inv._id === updated._id
              ? { ...inv, paymentStatus: updated.paymentStatus, paidAmount: updated.paidAmount }
              : inv)
            : []
        );
        setPaymentTarget(null);
      } else {
        alert('Failed to update payment status');
      }
    } catch (err) {
      console.error('Payment update error', err);
      alert('Error connecting to server');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) =>
    Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Invoice Card
  const InvoiceCard = useCallback(({ invoice }) => {
    const status = invoice.paymentStatus || 'Unpaid';
    const statusClass = `status-${status.toLowerCase()}`;
    const remaining = status === 'Partial'
      ? (invoice.grandTotal || 0) - (invoice.paidAmount || 0)
      : 0;

    return (
      <div className="invoice-card">
        <div className="invoice-card-header">
          <span className="invoice-number">#{invoice.invoiceNumber || 'N/A'}</span>
          <span className="invoice-date">{formatDate(invoice.invoiceDate)}</span>
        </div>

        <div className="invoice-customer-row">
          <span className="customer-name">{invoice.customerName || 'Unknown Customer'}</span>
        </div>

        <div className="invoice-amount-row">
          <div className="invoice-amount-block">
            <span className="invoice-amount-label">Total</span>
            <span className="invoice-amount">
              <span className="invoice-amount-currency">₹</span>
              {formatCurrency(invoice.grandTotal)}
            </span>
          </div>

          {status === 'Partial' && (
            <div className="invoice-amount-block">
              <span className="invoice-amount-label paid-lbl">Paid</span>
              <span className="invoice-amount paid-amt">
                <span className="invoice-amount-currency">₹</span>
                {formatCurrency(invoice.paidAmount)}
              </span>
            </div>
          )}

          {status === 'Partial' && (
            <div className="invoice-amount-block">
              <span className="invoice-amount-label due-lbl">Due</span>
              <span className="invoice-amount due-amt">
                <span className="invoice-amount-currency">₹</span>
                {formatCurrency(remaining)}
              </span>
            </div>
          )}
        </div>

        <div className="invoice-status-row">
          <button
            className={`payment-status-btn ${statusClass}`}
            onClick={() => openPaymentModal(invoice)}
            title="Tap to update payment status"
          >
            {status === 'Paid' ? '✅' : status === 'Partial' ? '🔶' : '⭕'} {status}
            <span className="status-edit-hint"> ✎</span>
          </button>
          {invoice.itemCount > 0 && (
            <span className="invoice-items-pill">
              {invoice.itemCount} item{invoice.itemCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="invoice-actions">
          <button className="action-btn action-btn-view" onClick={() => handleViewInvoice(invoice)}>
            <span>👁</span><span className="btn-label"> View</span>
          </button>
          <button className="action-btn action-btn-edit" onClick={() => handleEdit(invoice)}>
            <span>✏️</span><span className="btn-label"> Edit</span>
          </button>
          <button className="action-btn action-btn-delete" onClick={() => confirmDelete(invoice)}>
            <span>🗑</span><span className="btn-label"> Delete</span>
          </button>
        </div>
      </div>
    );
  }, [handleViewInvoice, handleEdit, confirmDelete, openPaymentModal]);

  return (
    <div className="dashboard-wrapper">
      {/* Header */}
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

      {/* Stats Bar */}
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

      {/* Search Bar — lives above the two-column area */}
      <div className="dashboard-content">
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

        {/* Two-column layout: GST Summary (left) | Invoices (right) */}
        <div className="dashboard-two-col">

          {/* LEFT: GST Summary */}
          {Object.keys(monthWiseData).length > 0 && (
            <aside className="gst-summary-section">
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
                      <div className="gst-month-row"><span>Subtotal</span><span>₹{formatCurrency(data.subtotal)}</span></div>
                      <div className="gst-month-row"><span>CGST</span><span>₹{formatCurrency(data.cgst)}</span></div>
                      <div className="gst-month-row"><span>SGST</span><span>₹{formatCurrency(data.sgst)}</span></div>
                      <div className="gst-month-row gst-month-tax-total"><span>Total Tax</span><span>₹{formatCurrency(data.totalTax)}</span></div>
                      <div className="gst-month-row gst-month-total"><span>Grand Total</span><span>₹{formatCurrency(data.grandTotal)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* RIGHT: Invoices */}
          <section className="invoices-section">
            <h2 className="section-title">
              <span className="section-title-icon">📄</span>
              Recent Invoices
              <span className="invoice-count-badge">{totalCount}</span>
            </h2>

            {invoices.length === 0 && !isLoading ? (
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
              <div className="invoice-list-container">
                {invoices.map(invoice => (
                  <InvoiceCard key={invoice._id} invoice={invoice} />
                ))}

                {isLoading && (
                  <div className="loading-indicator">
                    <div className="loading-spinner" />
                    Loading...
                  </div>
                )}

                {hasMore && !isLoading && (
                  <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <button
                      className="load-more-btn"
                      onClick={() => setPage(prev => prev + 1)}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
              <button className="modal-btn modal-btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="modal-btn modal-btn-delete" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Modal */}
      {paymentTarget && (
        <div className="delete-overlay" onClick={() => setPaymentTarget(null)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="payment-modal-title">💳 Update Payment Status</h3>
            <p className="payment-modal-sub">
              Invoice #{paymentTarget.invoiceNumber} — ₹{formatCurrency(paymentTarget.grandTotal)}
            </p>

            <div className="payment-status-choices">
              {['Paid', 'Unpaid', 'Partial'].map((s) => (
                <button
                  key={s}
                  className={`status-choice-btn status-choice-${s.toLowerCase()} ${newStatus === s ? 'active' : ''}`}
                  onClick={() => setNewStatus(s)}
                >
                  {s === 'Paid' ? '✅' : s === 'Partial' ? '🔶' : '⭕'} {s}
                </button>
              ))}
            </div>

            {newStatus === 'Partial' && (
              <div className="partial-amount-row">
                <label className="partial-label">Amount Paid (₹)</label>
                <input
                  className="partial-input"
                  type="number"
                  placeholder="Enter paid amount"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  min="0"
                  max={paymentTarget.grandTotal}
                />
                {paidAmount && (
                  <p className="partial-remaining">
                    Remaining: ₹{formatCurrency((paymentTarget.grandTotal || 0) - (parseFloat(paidAmount) || 0))}
                  </p>
                )}
              </div>
            )}

            <div className="delete-modal-actions" style={{ marginTop: '20px' }}>
              <button className="modal-btn modal-btn-cancel" onClick={() => setPaymentTarget(null)}>Cancel</button>
              <button className="modal-btn modal-btn-delete" style={{ background: '#2ecc71' }} onClick={savePaymentStatus}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
