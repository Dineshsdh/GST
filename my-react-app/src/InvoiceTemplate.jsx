import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './InvoiceTemplate.css';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Define styles for PDF content with optimized spacing and font sizes
const styles = StyleSheet.create({
  page: {
    padding: 20, // Reduced from 30
    fontSize: 10, // Reduced from 12
    fontFamily: 'Helvetica',
    height: '100%',
  },
  logo: {
    width: 80,
    height: 80,
    marginRight: 10,
  },
  section: {
    margin: 5, // Reduced from 10
    padding: 5, // Reduced from 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 5,
    alignItems: 'center', // Center items vertically
  },
  headerLeft: {
    flexDirection: 'row',
    width: '60%',
    alignItems: 'center', // Center items vertically
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center', // Center vertically
  },
  headerText: {
    flexDirection: 'column',
    alignItems: 'center', // Center text horizontally
    flex: 1, // Take available space to center properly
    textAlign: 'center',
  },
  companyName: {
    fontSize: 28, // Reduced from 18
    fontWeight: 'bold',
    fontFamily: 'Times-Roman',
    marginBottom: 3, // Reduced from 5
    color: '#0d6efd',
    textAlign: 'center',
    alignitems: 'center',
  },
  companyTagline: {
    fontSize: 12, // Reduced from 14
    fontWeight: 'bold',
    marginBottom: 3, // Reduced from 5
    textAlign: 'center',
  },
  companyAddress: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    marginBottom: 2,
    textAlign: 'center',
  },
  taxInvoice: {
    fontSize: 12, // Reduced from 14
    fontWeight: 'bold',
    border: '1px solid black',
    padding: 3, // Reduced from 5
    textAlign: 'center',
    marginBottom: 3, // Reduced from 5
  },
  row: {
    flexDirection: 'row',
    marginVertical: 3, // Reduced from 5
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10, // Reduced from 20
  },
  infoBox: {
    width: '48%',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  infoHeader: {
    backgroundColor: '#f8f9fa',
    padding: 3, // Reduced from 5
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    fontWeight: 'bold',
  },
  infoBody: {
    padding: 5, // Reduced from 10
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2, // Reduced from 5
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 3, // Reduced from 5
    width: '30%',
  },
  infoValue: {
    width: '70%',
  },
  table: {
    display: 'table',
    width: 'auto',
    marginVertical: 5, // Reduced from 10
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  tableRow: {
    flexDirection: 'row',
    // borderBottomWidth: 1, // Removed from here
    // borderBottomColor: '#dee2e6',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    fontWeight: 'bold',
  },
  tableCol: {
    padding: 3, // Reduced from 5
    borderRightWidth: 1,
    borderRightColor: '#dee2e6',
    borderBottomWidth: 1, // Added to here
    borderBottomColor: '#dee2e6',
  },
  colSNo: { width: '5%' },
  colDesc: { width: '30%' },
  colHSN: { width: '10%' },
  colWeight: { width: '10%' },
  colQty: { width: '10%' },
  colRate: { width: '10%' },
  colAmount: { width: '25%', borderRightWidth: 0 }, // Remove right border for last col
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    fontWeight: 'bold',
  },
  amountWords: {
    fontStyle: 'italic',
    marginBottom: 3, // Reduced from 5
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingBottom: 3, // Reduced from 5
  },
  bankDetails: {
    marginVertical: 5, // Reduced from 10
  },
  bankItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 2, // Reduced from 3
  },
  termsTitle: {
    fontWeight: 'bold',
    marginTop: 5, // Reduced from 10
    marginBottom: 3, // Reduced from 5
  },
  termItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 2, // Reduced from 3
  },
  signature: {
    alignItems: 'center',
    marginTop: 10, // Reduced from 20
  },
  signatureLine: {
    width: 150,
    borderBottomWidth: 1,
    borderBottomColor: 'black',
    marginBottom: 3, // Reduced from 5
  }
});

// Create Invoice PDF Document component
const InvoicePDF = ({ invoiceData }) => {
  const {
    companyName = "MEENA TRADERS",
    companyTagline = "YARN & WARP TRADERS",
    companyAddress = "Ground Floor, 56/8 Mu Su Thottannan Kadu,\nKarungalpatti Main Road, Gugai, SALEM - 636 006.",
    companyPhone = "63803 86768",
    companyGstin = "33RVLPS4153P1ZG",
    companyState = "Tamilnadu",
    companyStateCode = "33",
    companyLogo = null,

    customerName,
    customerAddress,
    customerGstin,
    customerState,
    customerStateCode,

    invoiceNumber,
    invoiceDate,

    items = [],

    cgstRate,
    sgstRate,
    subtotal,
    cgstAmount,
    sgstAmount,
    roundOff,
    grandTotal,

    amountInWords,
    signatureImage = null
  } = invoiceData;

  const addressLines = companyAddress.split('\n');

  // Function to format date to DD-MM-YYYY
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Calculate number of rows needed in the items table
  const itemsLength = items.length;
  const emptyRowsNeeded = Math.max(0, 3 - itemsLength); // Reduced to 3 empty rows

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Updated Header with Logo */}
        <View style={styles.header}>
          {/* Company Logo on Left */}
          {companyLogo ? (
            <Image
              src={companyLogo}
              style={styles.logo}
            />
          ) : (
            <View style={styles.logo} /> // Empty placeholder if no logo
          )}

          {/* Company Text - Centered */}
          <View style={styles.headerText}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyTagline}>{companyTagline}</Text>
            {addressLines.map((line, i) => (
              <Text key={i} style={styles.companyAddress}>{line}</Text>
            ))}
          </View>

          {/* TAX INVOICE on Right */}
          <View style={styles.headerRight}>
            <Text style={styles.taxInvoice}>TAX INVOICE</Text>
            <Text>Cell: {companyPhone}</Text>
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.infoSection}>
          <View style={{ width: '60%' }}>
            <Text><Text style={{ fontWeight: 'bold' }}>GSTIN:</Text> {companyGstin}</Text>
            <View style={styles.row}>
              <Text style={{ marginRight: 10 }}><Text style={{ fontWeight: 'bold' }}>Reverse Charge:</Text> Yes / No</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>State:</Text> {companyState}</Text>
            </View>
            <Text><Text style={{ fontWeight: 'bold' }}>State Code:</Text> {companyStateCode}</Text>
          </View>
          <View style={{ width: '40%', alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '50%' }}>
              <Text style={{ fontWeight: 'bold' }}>Invoice No:</Text>
              <Text>{invoiceNumber}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '50%' }}>
              <Text style={{ fontWeight: 'bold' }}>Invoice Date:</Text>
              <Text>{formatDate(invoiceDate)}</Text>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <View style={styles.infoHeader}>
              <Text>Details of Receiver / Billed to:</Text>
            </View>
            <View style={styles.infoBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{customerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{customerAddress}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GSTIN:</Text>
                <Text style={styles.infoValue}>{customerGstin}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>State:</Text>
                <Text style={styles.infoValue}>{customerState}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>State Code:</Text>
                <Text style={styles.infoValue}>{customerStateCode}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoHeader}>
              <Text>Details of Consignee / Shipped to:</Text>
            </View>
            <View style={styles.infoBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}></Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}></Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GSTIN:</Text>
                <Text style={styles.infoValue}></Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>State:</Text>
                <Text style={styles.infoValue}></Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>State Code:</Text>
                <Text style={styles.infoValue}></Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCol, styles.colSNo]}>
              <Text>S. No.</Text>
            </View>
            <View style={[styles.tableCol, styles.colDesc]}>
              <Text>Product Description</Text>
            </View>
            <View style={[styles.tableCol, styles.colHSN]}>
              <Text>HSN Code</Text>
            </View>
            <View style={[styles.tableCol, styles.colWeight]}>
              <Text>Weight</Text>
            </View>
            <View style={[styles.tableCol, styles.colQty]}>
              <Text>Qty</Text>
            </View>
            <View style={[styles.tableCol, styles.colRate]}>
              <Text>Rate</Text>
            </View>
            <View style={[styles.tableCol, styles.colAmount]}>
              <Text>Amount Rs.</Text>
            </View>
          </View>

          {/* Table Body */}
          {items.map((item, index) => {
            // For HSN column merging:
            // Only show content on first row.
            // Only show bottom border on last row (either last item if emptyRows is 0, or never here if emptyRows > 0, actually just handle last item if total rows logic applied).
            // To simplify: we want HSN column to look like one big box spanning all rows including empty.
            // So items loop: no bottom border for HSN.
            // Content: only index 0.

            const isLastItem = index === items.length - 1 && emptyRowsNeeded === 0;

            return (
              <View key={item.id || index} style={styles.tableRow}>
                <View style={[styles.tableCol, styles.colSNo]}>
                  <Text>{index + 1}</Text>
                </View>
                <View style={[styles.tableCol, styles.colDesc]}>
                  <Text>{item.description}</Text>
                </View>
                {/* MERGED HSN CELL LOGIC */}
                <View style={[
                  styles.tableCol,
                  styles.colHSN,
                  { borderBottomWidth: isLastItem ? 1 : 0 }
                ]}>
                  <Text>{index === 0 ? (item.hsnCode || '') : ''}</Text>
                </View>
                <View style={[styles.tableCol, styles.colWeight]}>
                  <Text>{item.weight || ''}</Text>
                </View>
                <View style={[styles.tableCol, styles.colQty]}>
                  <Text>{item.quantity}</Text>
                </View>
                <View style={[styles.tableCol, styles.colRate]}>
                  <Text>{item.rate.toFixed(2)}</Text>
                </View>
                <View style={[styles.tableCol, styles.colAmount]}>
                  <Text>{item.amount.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}

          {/* Empty rows to maintain layout - reduced to 3 max */}
          {Array.from({ length: emptyRowsNeeded }, (_, i) => {
            const isLastEmptyRow = i === emptyRowsNeeded - 1;
            return (
              <View key={`empty-${i}`} style={styles.tableRow}>
                <View style={[styles.tableCol, styles.colSNo]}>
                  <Text> </Text>
                </View>
                <View style={[styles.tableCol, styles.colDesc]}>
                  <Text> </Text>
                </View>
                {/* MERGED HSN CELL LOGIC */}
                <View style={[
                  styles.tableCol,
                  styles.colHSN,
                  { borderBottomWidth: isLastEmptyRow ? 1 : 0 }
                ]}>
                  <Text> </Text>
                </View>
                <View style={[styles.tableCol, styles.colWeight]}>
                  <Text> </Text>
                </View>
                <View style={[styles.tableCol, styles.colQty]}>
                  <Text> </Text>
                </View>
                <View style={[styles.tableCol, styles.colRate]}>
                  <Text> </Text>
                </View>
                <View style={[styles.tableCol, styles.colAmount]}>
                  <Text> </Text>
                </View>
              </View>
            );
          })}

          {/* Total row */}
          <View style={styles.tableRow}>
            <View style={[styles.tableCol, { width: '75%' }]}>
              <Text style={{ fontWeight: 'bold', textAlign: 'right' }}>TOTAL BEFORE TAX</Text>
            </View>
            <View style={[styles.tableCol, styles.colAmount]}>
              <Text style={{ fontWeight: 'bold' }}>{subtotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Section - Optimized for space */}
        <View style={{ flexDirection: 'row', marginTop: 5 }}>
          {/* Left Column - Amount in words & Bank details */}
          <View style={{ width: '50%', paddingRight: 5 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Total Invoice amount in words</Text>
            <Text style={styles.amountWords}>{amountInWords}</Text>

            <View style={styles.bankDetails}>
              <Text style={{ fontWeight: 'bold', fontSize: 9 }}>Bank Details:</Text>
              <View style={styles.bankItem}>
                <Text style={{ fontSize: 9 }}>Bank Name: FEDERAL BANK</Text>
              </View>
              <View style={styles.bankItem}>
                <Text style={{ fontSize: 9 }}>Bank A/c No: 23580200000820</Text>
              </View>
              <View style={styles.bankItem}>
                <Text style={{ fontSize: 9 }}>Bank Branch IFSC Code: FDRL0002358</Text>
              </View>
            </View>
            <Text style={styles.termsTitle}>Terms and Conditions:</Text>
            <View style={styles.termItem}>
              <Text style={{ fontSize: 8 }}>Interest at 24% will be charged on bills unpaid after 30 days.</Text>
            </View>
            <View style={styles.termItem}>
              <Text style={{ fontSize: 8 }}>Subject to Salem Jurisdiction</Text>
            </View>
            <View style={styles.termItem}>
              <Text style={{ fontSize: 8 }}>Goods are carefully counted and packed.</Text>
            </View>
            <View style={styles.termItem}>
              <Text style={{ fontSize: 8 }}>We accept no responsible for any loss or damage in transit.</Text>
            </View>
          </View>

          {/* Right Column - Tax details & Signature */}
          <View style={{ width: '50%', paddingLeft: 5 }}>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '70%' }]}>
                  <Text>Add: CGST - {cgstRate}%</Text>
                </View>
                <View style={[styles.tableCol, { width: '30%' }]}>
                  <Text style={{ textAlign: 'right' }}>{cgstAmount.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '70%' }]}>
                  <Text>Add: SGST - {sgstRate}%</Text>
                </View>
                <View style={[styles.tableCol, { width: '30%' }]}>
                  <Text style={{ textAlign: 'right' }}>{sgstAmount.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '70%' }]}>
                  <Text>Add: IGST - 0%</Text>
                </View>
                <View style={[styles.tableCol, { width: '30%' }]}>
                  <Text style={{ textAlign: 'right' }}>0.00</Text>
                </View>
              </View>
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '70%' }]}>
                  <Text>Total Tax Amount</Text>
                </View>
                <View style={[styles.tableCol, { width: '30%' }]}>
                  <Text style={{ textAlign: 'right' }}>{(cgstAmount + sgstAmount).toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '70%' }]}>
                  <Text>Round Off {roundOff >= 0 ? '+' : '-'}</Text>
                </View>
                <View style={[styles.tableCol, { width: '30%' }]}>
                  <Text style={{ textAlign: 'right' }}>{Math.abs(roundOff).toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '70%', fontWeight: 'bold' }]}>
                  <Text>Total Amount After Tax</Text>
                </View>
                <View style={[styles.tableCol, { width: '30%' }]}>
                  <Text style={{ textAlign: 'right', fontWeight: 'bold' }}>{grandTotal.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Signature Section */}
            <View style={styles.signature}>
              <Text style={{ fontSize: 9 }}>Certified that the particulars given above are true and correct</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 9 }}>For MEENA TRADERS</Text>
              <View style={{ marginTop: 20 }}>
                {/* Updated signature image handling */}
                {signatureImage ? (
                  <Image
                    src={signatureImage}
                    style={{ width: 150, height: 60 }}
                  />
                ) : (
                  <View style={styles.signatureLine} />
                )}
                <Text style={{ fontSize: 15, textAlign: 'center' }}>Authorised Signatory</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

function InvoiceTemplate() {
  const [invoiceData, setInvoiceData] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [companyLogo, setCompanyLogo] = useState(null);
  const navigate = useNavigate();
  const invoiceRef = useRef(null);
  const containerRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Calculate scale for A4 preview to fit mobile screen
  useEffect(() => {
    const calcScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const a4WidthPx = 793; // 210mm ≈ 793px at 96dpi
        if (containerWidth < a4WidthPx) {
          setPreviewScale(containerWidth / a4WidthPx);
        } else {
          setPreviewScale(1);
        }
      }
    };
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, [invoiceData]);

  useEffect(() => {
    // Get the invoice data from localStorage
    const data = localStorage.getItem('invoiceData');
    if (data) {
      const parsedData = JSON.parse(data);
      setInvoiceData(parsedData);

      // Try to get signature from localStorage if it exists, else use default
      const savedSignature = localStorage.getItem('signatureImage');
      if (savedSignature) {
        setSignatureImage(savedSignature);
      } else {
        setSignatureImage('/signature-image.png');
      }

      // Try to get logo from localStorage if it exists, else use default
      const savedLogo = localStorage.getItem('companyLogo');
      if (savedLogo) {
        setCompanyLogo(savedLogo);
      } else {
        setCompanyLogo('/Sowdeswari amman.jpg');
      }
    } else {
      // Redirect back if no data
      alert('No invoice data found!');
      navigate('/');
    }
  }, [navigate]);

  // Function to handle company logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target.result;
        setCompanyLogo(base64Image);
        localStorage.setItem('companyLogo', base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  // Function to handle signature upload
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target.result;
        setSignatureImage(base64Image);
        localStorage.setItem('signatureImage', base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!invoiceData) {
    return (
      <div className="inv-template-wrapper">
        <div className="inv-loading">
          <div className="inv-loading-spinner"></div>
          <span className="inv-loading-text">Loading invoice...</span>
        </div>
      </div>
    );
  }

  // Update invoiceData with signature for PDF generation
  const invoiceDataWithImages = {
    ...invoiceData,
    signatureImage: signatureImage,
    companyLogo: companyLogo
  };

  const {
    customerName,
    customerAddress,
    customerGstin,
    customerState,
    customerStateCode,

    invoiceNumber,
    invoiceDate,

    items,

    cgstRate,
    sgstRate,
    subtotal,
    cgstAmount,
    sgstAmount,
    roundOff,
    grandTotal,

    amountInWords
  } = invoiceData;

  return (
    <div className="inv-template-wrapper">
      {/* ===== Header ===== */}
      <header className="inv-header print-hide">
        <div className="inv-header-inner">
          <button className="inv-back-btn" onClick={() => navigate('/')}>
            ← Dashboard
          </button>
          <h1 className="inv-header-title">Invoice Preview</h1>
          <div style={{ width: '90px' }}></div>
        </div>
      </header>

      {/* ===== Sign & Logo Buttons (Top Center) ===== */}
      <div className="inv-upload-bar print-hide">
        <div className="inv-upload-bar-inner">
          <div className="inv-action-btn inv-action-btn-sig" style={{ position: 'relative' }}>
            {signatureImage ? '🔄 Change Sign' : '✍️ Add Sign'}
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="inv-action-file-input"
            />
          </div>
          <div className="inv-action-btn inv-action-btn-logo" style={{ position: 'relative' }}>
            {companyLogo ? '🔄 Change Logo' : '🏷️ Add Logo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="inv-action-file-input"
            />
          </div>
        </div>
      </div>

      {/* ===== Invoice Preview (Scaled to fit) ===== */}
      <div className="inv-preview-container" ref={containerRef}>
        <div
          className="inv-preview-scaler"
          style={{ height: previewScale < 1 ? `${1122 * previewScale}px` : 'auto' }}
        >
          <div
            ref={invoiceRef}
            className="inv-a4-page"
            id="printableInvoice"
            style={{ transform: `scale(${previewScale})` }}
          >
            {/* ====== A4 INVOICE CONTENT — Table-Based Layout ====== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: '1.4' }}>
              <tbody>
                {/* ── Company Header ── */}
                <tr>
                  <td colSpan="7" style={{ padding: '0 0 8px 0', borderBottom: '2px solid #333' }}>
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '80px', verticalAlign: 'top', padding: '0 12px 0 0' }}>
                            {companyLogo && (
                              <img src={companyLogo} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                            )}
                          </td>
                          <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a5276', marginBottom: '2px' }}>
                              {invoiceData.companyName || 'MEENA TRADERS'}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
                              {invoiceData.companyTagline || 'YARN & WARP TRADERS'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#555' }}>
                              {(invoiceData.companyAddress || 'Ground Floor, 56/8 Mu Su Thottannan Kadu,\nKarungalpatti Main Road, Gugai, SALEM - 636 006.').split('\n').map((line, i) => (
                                <span key={i}>{line}<br /></span>
                              ))}
                            </div>
                          </td>
                          <td style={{ width: '160px', verticalAlign: 'top', textAlign: 'right' }}>
                            <div style={{ border: '2px solid #333', padding: '6px 14px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', marginBottom: '6px' }}>
                              TAX INVOICE
                            </div>
                            <div style={{ fontSize: '10px' }}>
                              Cell: {invoiceData.companyPhone || '63803 86768'}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* ── GSTIN / Invoice Details Row ── */}
                <tr>
                  <td colSpan="7" style={{ padding: '8px 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '60%', verticalAlign: 'top', fontSize: '10px' }}>
                            <div><strong>GSTIN:</strong> {invoiceData.companyGstin || '33RVLPS4153P1ZG'}</div>
                            <div style={{ display: 'flex', gap: '24px', marginTop: '2px' }}>
                              <span><strong>Reverse Charge:</strong> Yes / No</span>
                              <span><strong>State:</strong> {invoiceData.companyState || 'Tamilnadu'}</span>
                            </div>
                            <div style={{ marginTop: '2px' }}><strong>State Code:</strong> {invoiceData.companyStateCode || '33'}</div>
                          </td>
                          <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'right', fontSize: '10px' }}>
                            <div><strong>Invoice No:</strong> {invoiceNumber}</div>
                            <div style={{ marginTop: '2px' }}>
                              <strong>Invoice Date:</strong>{' '}
                              {(() => {
                                if (!invoiceDate) return '';
                                const d = new Date(invoiceDate);
                                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                              })()}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* ── Buyer / Consignee Details ── */}
                <tr>
                  <td colSpan="7" style={{ padding: '0 0 8px 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #999' }}>
                            <div style={{ background: '#f0f0f0', padding: '4px 8px', fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #999' }}>
                              Details of Receiver / Billed to:
                            </div>
                            <div style={{ padding: '6px 8px', fontSize: '10px' }}>
                              <div style={{ marginBottom: '2px' }}><strong>Name:</strong> {customerName}</div>
                              <div style={{ marginBottom: '2px' }}><strong>Address:</strong> {customerAddress}</div>
                              <div style={{ marginBottom: '2px' }}><strong>GSTIN:</strong> {customerGstin}</div>
                              <div style={{ marginBottom: '2px' }}><strong>State:</strong> {customerState}</div>
                              <div><strong>State Code:</strong> {customerStateCode}</div>
                            </div>
                          </td>
                          <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #999' }}>
                            <div style={{ background: '#f0f0f0', padding: '4px 8px', fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #999' }}>
                              Details of Consignee / Shipped to:
                            </div>
                            <div style={{ padding: '6px 8px', fontSize: '10px' }}>
                              <div style={{ marginBottom: '2px' }}><strong>Name:</strong></div>
                              <div style={{ marginBottom: '2px' }}><strong>Address:</strong></div>
                              <div style={{ marginBottom: '2px' }}><strong>GSTIN:</strong></div>
                              <div style={{ marginBottom: '2px' }}><strong>State:</strong></div>
                              <div><strong>State Code:</strong></div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* ── Items Table ── */}
                <tr>
                  <td colSpan="7" style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999' }}>
                      <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                          <th style={{ border: '1px solid #999', padding: '5px 4px', textAlign: 'center', fontSize: '10px', width: '6%' }}>S.No.</th>
                          <th style={{ border: '1px solid #999', padding: '5px 4px', textAlign: 'left', fontSize: '10px', width: '34%' }}>Product Description</th>
                          <th style={{ border: '1px solid #999', padding: '5px 4px', textAlign: 'center', fontSize: '10px', width: '12%' }}>HSN Code</th>
                          <th style={{ border: '1px solid #999', padding: '5px 4px', textAlign: 'center', fontSize: '10px', width: '10%' }}>Weight</th>
                          <th style={{ border: '1px solid #999', padding: '5px 4px', textAlign: 'center', fontSize: '10px', width: '8%' }}>Qty</th>
                          <th style={{ border: '1px solid #999', padding: '5px 4px', textAlign: 'right', fontSize: '10px', width: '14%' }}>Rate</th>
                          <th style={{ border: '1px solid #999', padding: '5px 4px', textAlign: 'right', fontSize: '10px', width: '16%' }}>Amount Rs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={item.id}>
                            <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontSize: '10px' }}>{index + 1}</td>
                            <td style={{ border: '1px solid #999', padding: '4px 6px', fontSize: '10px' }}>{item.description}</td>
                            <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontSize: '10px' }}>{item.hsnCode}</td>
                            <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontSize: '10px' }}>{item.weight || ''}</td>
                            <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontSize: '10px' }}>{item.quantity}</td>
                            <td style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'right', fontSize: '10px' }}>₹{item.rate.toFixed(2)}</td>
                            <td style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'right', fontSize: '10px' }}>₹{item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                        {/* Empty rows for consistent layout */}
                        {Array.from({ length: Math.max(0, 8 - items.length) }, (_, i) => (
                          <tr key={`empty-${i}`}>
                            <td style={{ border: '1px solid #999', padding: '4px', height: '22px' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #999', padding: '4px' }}></td>
                            <td style={{ border: '1px solid #999', padding: '4px' }}></td>
                            <td style={{ border: '1px solid #999', padding: '4px' }}></td>
                            <td style={{ border: '1px solid #999', padding: '4px' }}></td>
                            <td style={{ border: '1px solid #999', padding: '4px' }}></td>
                            <td style={{ border: '1px solid #999', padding: '4px' }}></td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                          <td colSpan="6" style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right', fontSize: '10px' }}>TOTAL BEFORE TAX</td>
                          <td style={{ border: '1px solid #999', padding: '5px 6px', textAlign: 'right', fontSize: '10px' }}>₹{subtotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* ── Bottom Section: Bank/Terms (Left) + Tax/Signature (Right) ── */}
                <tr>
                  <td colSpan="7" style={{ padding: '8px 0 0 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999' }}>
                      <tbody>
                        <tr>
                          {/* ── Left Column: Words, Bank, Terms ── */}
                          <td style={{ width: '50%', verticalAlign: 'top', borderRight: '1px solid #999', padding: '0' }}>
                            {/* Amount in Words */}
                            <div style={{ padding: '6px 8px', borderBottom: '1px solid #999', fontSize: '10px' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Total Invoice Amount in Words</div>
                              <div style={{ fontStyle: 'italic' }}>{amountInWords}</div>
                            </div>
                            {/* Bank Details */}
                            <div style={{ padding: '6px 8px', borderBottom: '1px solid #999', fontSize: '10px' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Bank Details:</div>
                              <div style={{ marginBottom: '2px' }}><strong>Bank Name:</strong> FEDERAL BANK</div>
                              <div style={{ marginBottom: '2px' }}><strong>Bank A/c No:</strong> 23580200000820</div>
                              <div><strong>Bank Branch IFSC Code:</strong> FDRL0002358</div>
                            </div>
                            {/* Terms */}
                            <div style={{ padding: '6px 8px', fontSize: '9px', color: '#555' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '10px', color: '#333' }}>Terms and Conditions:</div>
                              <div style={{ marginBottom: '1px' }}>1. Interest at 24% will be charged on bills unpaid after 30 days.</div>
                              <div style={{ marginBottom: '1px' }}>2. Subject to Salem Jurisdiction.</div>
                              <div style={{ marginBottom: '1px' }}>3. Goods are carefully counted and packed.</div>
                              <div>4. We accept no responsibility for any loss or damage in transit.</div>
                            </div>
                          </td>

                          {/* ── Right Column: Tax Table + Signature ── */}
                          <td style={{ width: '50%', verticalAlign: 'top', padding: '0' }}>
                            {/* Tax Breakdown */}
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px' }}>Add: CGST - {cgstRate}%</td>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px', textAlign: 'right' }}>₹{cgstAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px' }}>Add: SGST - {sgstRate}%</td>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px', textAlign: 'right' }}>₹{sgstAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px' }}>Add: IGST - 0%</td>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px', textAlign: 'right' }}>₹0.00</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px' }}>Total Tax Amount</td>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px', textAlign: 'right' }}>₹{(cgstAmount + sgstAmount).toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px' }}>Round Off {roundOff >= 0 ? '+' : '-'}</td>
                                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #ccc', fontSize: '10px', textAlign: 'right' }}>₹{Math.abs(roundOff).toFixed(2)}</td>
                                </tr>
                                <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #999', fontSize: '11px' }}>Total Amount After Tax</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #999', fontSize: '11px', textAlign: 'right' }}>₹{grandTotal.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Certification + Signature */}
                            <div style={{ padding: '10px 8px', textAlign: 'center', fontSize: '10px' }}>
                              <p style={{ margin: '0 0 4px 0' }}>Certified that the particulars given above are true and correct</p>
                              <p style={{ margin: '0 0 16px 0', fontWeight: 'bold' }}>For {invoiceData.companyName || 'MEENA TRADERS'}</p>
                              {signatureImage ? (
                                <div>
                                  <img
                                    src={signatureImage}
                                    alt="Authorised Signatory"
                                    style={{ height: '50px', maxWidth: '160px', display: 'block', margin: '0 auto 4px' }}
                                  />
                                  <p style={{ margin: 0, fontSize: '9px' }}>Authorised Signatory</p>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ width: '160px', borderBottom: '1px solid #333', margin: '20px auto 6px' }}></div>
                                  <p style={{ margin: 0, fontSize: '9px' }}>Authorised Signatory</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== Sticky Bottom Download PDF ===== */}
      <div className="inv-sticky-download print-hide">
        <PDFDownloadLink
          document={<InvoicePDF invoiceData={invoiceDataWithImages} />}
          fileName={`Invoice-${invoiceData?.invoiceNumber || 'download'}.pdf`}
          className="inv-download-btn"
          style={{ textDecoration: 'none' }}
        >
          {({ loading }) => loading ? '⏳ Generating PDF...' : '📥 Download PDF'}
        </PDFDownloadLink>
      </div>
    </div>
  );
}

export default InvoiceTemplate;