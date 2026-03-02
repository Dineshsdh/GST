const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    // Company Details (Snapshot at time of invoice)
    companyName: String,
    companyTagline: String,
    companyAddress: String,
    companyGstin: String,
    companyState: String,
    companyStateCode: String,
    companyPhone: String,

    // Customer Details
    customerName: { type: String, required: true },
    customerAddress: String,
    customerGstin: String,
    customerState: String,
    customerStateCode: String,

    // Invoice Details
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },

    // Items
    items: [{
        description: String,
        weight: String,
        hsnCode: String,
        quantity: Number,
        rate: Number,
        amount: Number
    }],

    // Tax & Totals
    cgstRate: Number,
    sgstRate: Number,
    subtotal: Number,
    cgstAmount: Number,
    sgstAmount: Number,
    roundOff: Number,
    grandTotal: Number,

    // Misc
    amountInWords: String,
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
    paidAmount: { type: Number, default: 0 }, // Used when paymentStatus is 'Partial'

    // Metadata
    createdAt: { type: Date, default: Date.now }
});

// Index for sorting by date
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customerName: 1 });
invoiceSchema.index({ paymentStatus: 1 });
// Compound index for frequent dashboard queries
invoiceSchema.index({ invoiceDate: -1, customerName: 1, paymentStatus: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
