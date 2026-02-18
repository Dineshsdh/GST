import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Table,
  InputGroup,
  Dropdown
} from 'react-bootstrap';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './GSTInvoice.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import InvoiceTemplate from './InvoiceTemplate';
import Dashboard from './Dashboard';

// Main App component with routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<GSTInvoiceGenerator />} />
        <Route path="/invoice" element={<InvoiceTemplate />} />
      </Routes>
    </Router>
  );
}

function GSTInvoiceGenerator() {
  const navigate = useNavigate();

  // State management
  const [items, setItems] = useState([
    { id: '1', description: '', weight: '0', hsnCode: '', quantity: 0, rate: 0, amount: 0 }
  ]);
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [roundOff, setRoundOff] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    address: '',
    gstin: '',
    state: '',
    stateCode: '',
  });

  // State for cached customer entries
  const [cachedCustomers, setCachedCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Track if we are editing an existing invoice
  const [editingId, setEditingId] = useState(null);

  const [companyInfo] = useState({
    name: 'MEENA TRADERS',
    tagline: 'YARN & WARP TRADERS',
    address: 'Ground Floor, 56/8 Mu Su Thottannan Kadu,\nKarungalpatti Main Road, Gugai, SALEM - 636 006.',
    gstin: '33RVLPS4153P1ZG',
    state: 'Tamilnadu',
    stateCode: '33',
    phone: '63803 86768'
  });
  const [invoiceInfo, setInvoiceInfo] = useState({
    number: '',
    date: new Date(),
  });
  const [subtotal, setSubtotal] = useState(0);
  const [cgstAmount, setCgstAmount] = useState(0);
  const [sgstAmount, setSgstAmount] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [amountInWords, setAmountInWords] = useState('Rupees Zero Only');

  // API base URL
  // API base URL
  // In production, use the environment variable. In development, use the proxy or fallback.
  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  // Load customers from MongoDB when component mounts
  // Also load edit data if redirected from Dashboard edit
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${API_BASE}/customers`);
        if (res.ok) {
          const data = await res.json();
          setCachedCustomers(data);
        }
      } catch (err) {
        console.warn('Could not load customers from server:', err.message);
        // Fallback removed as we are migrating to MongoDB completely
      }
    };
    fetchCustomers();



    // Check if we are editing an existing invoice (ID passed from Dashboard)
    const editId = localStorage.getItem('editInvoiceId');
    if (editId) {
      fetch(`${API_BASE}/invoices/${editId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Invoice not found");
        })
        .then(invoiceToEdit => {
          setEditingId(editId);
          setCustomerInfo({
            name: invoiceToEdit.customerName || '',
            address: invoiceToEdit.customerAddress || '',
            gstin: invoiceToEdit.customerGstin || '',
            state: invoiceToEdit.customerState || '',
            stateCode: invoiceToEdit.customerStateCode || '',
          });
          setInvoiceInfo({
            number: invoiceToEdit.invoiceNumber || '',
            date: invoiceToEdit.invoiceDate ? new Date(invoiceToEdit.invoiceDate) : new Date(),
          });
          if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
            setItems(invoiceToEdit.items);
          }
          setCgstRate(invoiceToEdit.cgstRate ?? 2.5);
          setSgstRate(invoiceToEdit.sgstRate ?? 2.5);
          setRoundOff(invoiceToEdit.roundOff ?? 0);
        })
        .catch(err => {
          console.error("Error fetching invoice for edit:", err);
          alert("Could not load invoice details.");
        })
        .finally(() => {
          localStorage.removeItem('editInvoiceId');
        });
    }
  }, []);

  // Helper functions
  const calculateAmount = (weight, quantity, rate) => {
    const weightNum = parseFloat(weight) || 0;
    return weightNum * quantity * rate;
  };

  const calculateAutoRoundOff = () => {
    const initialTotal = subtotal + totalTax;
    const roundedTotal = Math.round(initialTotal);
    return roundedTotal - initialTotal;
  };

  // Convert number to words function
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    // For decimal handling
    let rupees = Math.floor(num);
    let paise = Math.round((num - rupees) * 100);

    function convertGroupOfDigits(num) {
      if (num === 0) return '';
      else if (num < 20) return ones[num];
      else if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
      else return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertGroupOfDigits(num % 100) : '');
    }

    let words = '';
    let digits = 0;

    // Handle crores (1,00,00,000)
    digits = Math.floor(rupees / 10000000) % 100;
    if (digits > 0) words += convertGroupOfDigits(digits) + ' ' + scales[3] + ' ';

    // Handle lakhs (1,00,000)
    digits = Math.floor(rupees / 100000) % 100;
    if (digits > 0) words += convertGroupOfDigits(digits) + ' ' + scales[2] + ' ';

    // Handle thousands (1,000)
    digits = Math.floor(rupees / 1000) % 100;
    if (digits > 0) words += convertGroupOfDigits(digits) + ' ' + scales[1] + ' ';

    // Handle hundreds, tens, and ones
    digits = rupees % 1000;
    if (digits > 0) words += convertGroupOfDigits(digits);

    // Add rupees text
    words = words.trim() + ' Rupees';

    // Add paise if any
    if (paise > 0) {
      words += ' and ' + convertGroupOfDigits(paise) + ' Paise';
    }

    return words + ' Only';
  };

  // Handle customer and invoice info changes
  const handleCustomerInfoChange = (field, value) => {
    setCustomerInfo({
      ...customerInfo,
      [field]: value
    });
  };

  const handleInvoiceInfoChange = (field, value) => {
    setInvoiceInfo({
      ...invoiceInfo,
      [field]: value
    });
  };

  // Save current customer to cache
  const saveCustomerToCache = async () => {
    // Only save if at least customer name is provided
    if (customerInfo.name.trim()) {
      try {
        const res = await fetch(`${API_BASE}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerInfo),
        });

        if (res.ok) {
          const savedCustomer = await res.json();

          // Update local state to reflect new data
          setCachedCustomers(prev => {
            const index = prev.findIndex(c => c.name === savedCustomer.name);
            if (index >= 0) {
              const newArr = [...prev];
              newArr[index] = savedCustomer;
              return newArr;
            }
            return [...prev, savedCustomer];
          });

          alert("Customer details saved to database!");
        } else {
          const errData = await res.json();
          alert(`Error saving customer: ${errData.message}`);
        }
      } catch (err) {
        console.error('Save customer error:', err);
        alert('Could not save customer. Server might be down.');
      }
    } else {
      alert("Please enter at least the customer name before saving");
    }
  };

  // Handle selecting customer from dropdown
  const selectCustomer = (customer) => {
    setCustomerInfo(customer);
    setShowCustomerDropdown(false);
  };

  // Handle clear all customers from MongoDB
  const clearCustomerCache = async () => {
    if (!window.confirm('Are you sure you want to delete all saved customers?')) return;
    try {
      const res = await fetch(`${API_BASE}/customers`, { method: 'DELETE' });
      if (res.ok) {
        setCachedCustomers([]);
        alert('All customers deleted from database!');
      }
    } catch (err) {
      console.error('Clear customers error:', err);
      alert('Could not connect to server.');
    }
  };

  // Handle item changes
  const handleItemChange = (id, field, value) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        if (field === 'weight' || field === 'quantity' || field === 'rate') {
          const weight = field === 'weight' ? value : item.weight;
          const quantity = field === 'quantity' ? Number(value) : item.quantity;
          const rate = field === 'rate' ? Number(value) : item.rate;

          updatedItem.amount = calculateAmount(weight, quantity, rate);
        }
        return updatedItem;
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Add new item
  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: '',
      weight: '0',
      hsnCode: '',
      quantity: 0,
      rate: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  // Remove item
  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Apply auto round off
  const applyAutoRoundOff = () => {
    const calculatedRoundOff = calculateAutoRoundOff();
    setRoundOff(calculatedRoundOff);
  };

  const generateInvoice = () => {
    // Validation
    if (!customerInfo.name) {
      alert('Please enter customer name');
      return;
    }

    if (!invoiceInfo.number) {
      alert('Please enter invoice number');
      return;
    }

    if (items.length === 0 || subtotal === 0) {
      alert('Please add at least one item with quantity and rate');
      return;
    }

    // Save current customer to cache automatically when generating invoice
    // Save current customer to cache automatically when generating invoice
    if (customerInfo.name.trim()) {
      // Optimistically update local state if needed or fire-and-forget save
      fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerInfo),
      }).then(res => {
        if (res.ok) {
          res.json().then(savedCustomer => {
            setCachedCustomers(prev => {
              const index = prev.findIndex(c => c.name === savedCustomer.name);
              if (index >= 0) {
                const newArr = [...prev];
                newArr[index] = savedCustomer;
                return newArr;
              }
              return [...prev, savedCustomer];
            });
          });
        }
      }).catch(err => console.warn("Auto-save customer failed", err));
    }

    // Collect all invoice data
    const invoiceData = {
      // Unique ID for dashboard management
      id: editingId || Date.now().toString(),

      // Company details
      companyName: companyInfo.name,
      companyTagline: companyInfo.tagline,
      companyAddress: companyInfo.address,
      companyGstin: companyInfo.gstin,
      companyState: companyInfo.state,
      companyStateCode: companyInfo.stateCode,
      companyPhone: companyInfo.phone,

      // Customer details
      customerName: customerInfo.name,
      customerAddress: customerInfo.address,
      customerGstin: customerInfo.gstin,
      customerState: customerInfo.state,
      customerStateCode: customerInfo.stateCode,

      // Invoice details
      invoiceNumber: invoiceInfo.number,
      invoiceDate: invoiceInfo.date,

      // Items
      items: items,

      // Tax details
      cgstRate,
      sgstRate,
      subtotal,
      cgstAmount,
      sgstAmount,
      roundOff,
      grandTotal,

      // Amount in words
      amountInWords
    };


    // --- Save to Backend (MongoDB) ---
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_BASE}/invoices/${editingId}` : `${API_BASE}/invoices`;

    // Remove _id from body if it exists, to avoid immutable field error on some setups, 
    // although Mongoose usually ignores it if matches. Best to be clean.
    const { _id, ...bodyData } = invoiceData;

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save invoice');
        return res.json();
      })
      .then(savedInvoice => {
        // Success
        console.log("Invoice saved:", savedInvoice);
        // Important: We still save to localStorage ONLY for the Preview page (InvoiceTemplate.jsx) 
        // because it reads from there. We DON'T save to 'savedInvoices' list anymore.
        localStorage.setItem('invoiceData', JSON.stringify(invoiceData));
        navigate('/invoice');
      })
      .catch(err => {
        console.error("Error saving invoice:", err);
        alert("Error saving invoice to database: " + err.message);
      });
  };

  // Update totals whenever relevant values change
  useEffect(() => {
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const calculatedCgstAmount = (calculatedSubtotal * cgstRate) / 100;
    const calculatedSgstAmount = (calculatedSubtotal * sgstRate) / 100;
    const calculatedTotalTax = calculatedCgstAmount + calculatedSgstAmount;
    const calculatedGrandTotal = calculatedSubtotal + calculatedTotalTax + roundOff;

    setSubtotal(calculatedSubtotal);
    setCgstAmount(calculatedCgstAmount);
    setSgstAmount(calculatedSgstAmount);
    setTotalTax(calculatedTotalTax);
    setGrandTotal(calculatedGrandTotal);

    // Update amount in words
    setAmountInWords(numberToWords(calculatedGrandTotal));
  }, [items, cgstRate, sgstRate, roundOff]);

  return (
    <div className="gst-form-wrapper">
      {/* ===== Header Bar ===== */}
      <header className="gst-form-header">
        <div className="gst-form-header-inner">
          <button className="gst-back-btn" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1 className="gst-header-title">
            {editingId ? '✏️ Edit Invoice' : '📝 New Invoice'}
          </h1>
          <button className="gst-generate-btn-header" onClick={generateInvoice}>
            Generate
          </button>
        </div>
      </header>

      <div className="gst-form-content">
        {/* ===== Invoice Details ===== */}
        <div className="gst-section">
          <div className="gst-section-header">
            <h3 className="gst-section-title">
              <span className="gst-section-icon">📋</span> Invoice Details
            </h3>
          </div>
          <div className="gst-section-body">
            <div className="gst-field-row">
              <div className="gst-field">
                <label className="gst-field-label">Invoice No</label>
                <input
                  className="gst-field-input"
                  type="text"
                  placeholder="e.g. INV-001"
                  value={invoiceInfo.number}
                  onChange={(e) => handleInvoiceInfoChange('number', e.target.value)}
                />
              </div>
              <div className="gst-field">
                <label className="gst-field-label">Invoice Date</label>
                <DatePicker
                  selected={invoiceInfo.date}
                  onChange={(date) => handleInvoiceInfoChange('date', date)}
                  dateFormat="dd/MM/yyyy"
                  className="gst-field-input"
                  wrapperClassName="gst-datepicker-wrapper"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===== Customer Details ===== */}
        <div className="gst-section">
          <div className="gst-section-header">
            <h3 className="gst-section-title">
              <span className="gst-section-icon">👤</span> Customer Details
            </h3>
            <div className="gst-section-actions">
              <button
                className="gst-small-btn gst-btn-outline-blue"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              >
                {showCustomerDropdown ? 'Hide' : '📂 Load'}
              </button>
              <button
                className="gst-small-btn gst-btn-outline-green"
                onClick={saveCustomerToCache}
              >
                💾 Save
              </button>
            </div>
          </div>
          <div className="gst-section-body">
            {/* Cached Customers Dropdown */}
            {showCustomerDropdown && (
              <div className="gst-cache-list">
                {cachedCustomers.length === 0 ? (
                  <div className="gst-cache-item" style={{ color: '#adb5bd', cursor: 'default' }}>
                    No saved customers
                  </div>
                ) : (
                  <>
                    {cachedCustomers.map((customer, index) => (
                      <div
                        key={index}
                        className="gst-cache-item"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className="gst-cache-item-name">{customer.name}</div>
                        {customer.gstin && (
                          <div className="gst-cache-item-gstin">GSTIN: {customer.gstin}</div>
                        )}
                      </div>
                    ))}
                    <div style={{ padding: '8px 14px', textAlign: 'right' }}>
                      <button className="gst-small-btn gst-btn-outline-red" onClick={clearCustomerCache}>
                        🗑 Clear All
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="gst-field">
              <label className="gst-field-label">Name</label>
              <input
                className="gst-field-input"
                type="text"
                placeholder="Customer name"
                value={customerInfo.name}
                onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
              />
            </div>
            <div className="gst-field">
              <label className="gst-field-label">Address</label>
              <textarea
                className="gst-field-input"
                rows={2}
                placeholder="Customer address"
                value={customerInfo.address}
                onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="gst-field">
              <label className="gst-field-label">GSTIN</label>
              <input
                className="gst-field-input"
                type="text"
                placeholder="Enter GSTIN"
                value={customerInfo.gstin}
                onChange={(e) => handleCustomerInfoChange('gstin', e.target.value)}
              />
            </div>
            <div className="gst-field-row">
              <div className="gst-field">
                <label className="gst-field-label">State</label>
                <input
                  className="gst-field-input"
                  type="text"
                  placeholder="State"
                  value={customerInfo.state}
                  onChange={(e) => handleCustomerInfoChange('state', e.target.value)}
                />
              </div>
              <div className="gst-field">
                <label className="gst-field-label">State Code</label>
                <input
                  className="gst-field-input"
                  type="text"
                  placeholder="Code"
                  value={customerInfo.stateCode}
                  onChange={(e) => handleCustomerInfoChange('stateCode', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===== Items ===== */}
        <div className="gst-section">
          <div className="gst-section-header">
            <h3 className="gst-section-title">
              <span className="gst-section-icon">📦</span> Items ({items.length})
            </h3>
          </div>
          <div className="gst-section-body">
            <div className="gst-items-list">
              {items.map((item, index) => (
                <div className="gst-item-card" key={item.id}>
                  <div className="gst-item-card-header">
                    <span className="gst-item-number">#{index + 1}</span>
                    <span className="gst-item-amount">₹{item.amount.toFixed(2)}</span>
                    <button
                      className="gst-item-remove"
                      onClick={() => removeItem(item.id)}
                      title="Remove item"
                    >
                      ×
                    </button>
                  </div>

                  <div className="gst-item-grid">
                    <div className="gst-field gst-item-grid-full">
                      <label className="gst-field-label">Description</label>
                      <input
                        className="gst-field-input"
                        type="text"
                        placeholder="Product description"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="gst-field">
                      <label className="gst-field-label">Weight</label>
                      <input
                        className="gst-field-input"
                        type="text"
                        placeholder="Weight"
                        value={item.weight}
                        onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                        onFocus={(e) => item.weight === '0' && handleItemChange(item.id, 'weight', '')}
                        onBlur={(e) => item.weight === '' && handleItemChange(item.id, 'weight', '0')}
                      />
                    </div>
                    <div className="gst-field">
                      <label className="gst-field-label">HSN Code</label>
                      <input
                        className="gst-field-input"
                        type="text"
                        placeholder="HSN"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                      />
                    </div>
                    <div className="gst-field">
                      <label className="gst-field-label">Qty</label>
                      <input
                        className="gst-field-input"
                        type="number"
                        placeholder="0"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="gst-field">
                      <label className="gst-field-label">Rate</label>
                      <input
                        className="gst-field-input"
                        type="number"
                        placeholder="0.00"
                        value={item.rate || ''}
                        onChange={(e) => handleItemChange(item.id, 'rate', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button className="gst-add-item-btn" onClick={addItem}>
                <span>+</span> Add Item
              </button>
            </div>
          </div>
        </div>

        {/* ===== GST & Tax Details ===== */}
        <div className="gst-section">
          <div className="gst-section-header">
            <h3 className="gst-section-title">
              <span className="gst-section-icon">💰</span> Tax & Summary
            </h3>
          </div>
          <div className="gst-section-body">
            <div className="gst-tax-row">
              <span className="gst-tax-label">Subtotal</span>
              <span className="gst-tax-value">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="gst-tax-row">
              <div className="gst-tax-row-edit">
                <span className="gst-tax-label">CGST</span>
                <input
                  className="gst-tax-input"
                  type="number"
                  value={cgstRate}
                  onChange={(e) => setCgstRate(Number(e.target.value))}
                />
                <span className="gst-tax-label">%</span>
              </div>
              <span className="gst-tax-value">₹{cgstAmount.toFixed(2)}</span>
            </div>

            <div className="gst-tax-row">
              <div className="gst-tax-row-edit">
                <span className="gst-tax-label">SGST</span>
                <input
                  className="gst-tax-input"
                  type="number"
                  value={sgstRate}
                  onChange={(e) => setSgstRate(Number(e.target.value))}
                />
                <span className="gst-tax-label">%</span>
              </div>
              <span className="gst-tax-value">₹{sgstAmount.toFixed(2)}</span>
            </div>

            <div className="gst-tax-row">
              <span className="gst-tax-label">Total Tax</span>
              <span className="gst-tax-value" style={{ fontWeight: 700 }}>₹{totalTax.toFixed(2)}</span>
            </div>

            <div className="gst-tax-row">
              <div className="gst-tax-row-edit">
                <span className="gst-tax-label">Round Off</span>
                <input
                  className="gst-tax-input"
                  type="number"
                  step="0.01"
                  value={roundOff}
                  onChange={(e) => setRoundOff(Number(e.target.value))}
                />
                <button className="gst-round-off-btn" onClick={applyAutoRoundOff}>
                  Auto
                </button>
              </div>
              <span className="gst-tax-value">₹{roundOff.toFixed(2)}</span>
            </div>

            {/* Grand Total */}
            <div className="gst-grand-total">
              <span className="gst-grand-total-label">Grand Total</span>
              <span className="gst-grand-total-value">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ===== Amount in Words ===== */}
        <div className="gst-section">
          <div className="gst-section-header">
            <h3 className="gst-section-title">
              <span className="gst-section-icon">🔤</span> Amount in Words
            </h3>
          </div>
          <div className="gst-section-body">
            <div className="gst-words-box">{amountInWords}</div>
          </div>
        </div>
      </div>

      {/* ===== Sticky Generate Button ===== */}
      <div className="gst-sticky-generate">
        <button className="gst-generate-btn" onClick={generateInvoice}>
          🧾 Generate Invoice
        </button>
      </div>
    </div>
  );
}

export default App;