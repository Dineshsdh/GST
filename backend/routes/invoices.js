const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

// GET /api/invoices - Fetch all invoices (sorted by date desc)
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ invoiceDate: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/invoices/summary - Get GST Summary (Aggregated)
router.get('/summary', async (req, res) => {
    try {
        const summary = await Invoice.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$invoiceDate" },
                        month: { $month: "$invoiceDate" }
                    },
                    count: { $sum: 1 },
                    subtotal: { $sum: "$subtotal" },
                    cgst: { $sum: "$cgstAmount" },
                    sgst: { $sum: "$sgstAmount" },
                    grandTotal: { $sum: "$grandTotal" },
                    invoices: {
                        $push: {
                            id: "$_id",
                            invoiceNumber: "$invoiceNumber",
                            invoiceDate: "$invoiceDate",
                            customerName: "$customerName",
                            grandTotal: "$grandTotal"
                        }
                    }
                }
            },
            {
                $sort: { "_id.year": -1, "_id.month": -1 }
            }
        ]);

        // Format for frontend (convert month number to name, etc.)
        const formattedSummary = summary.map(item => {
            const date = new Date(item._id.year, item._id.month - 1);
            const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;

            return {
                key: monthKey,
                label: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
                count: item.count,
                subtotal: item.subtotal,
                cgst: item.cgst,
                sgst: item.sgst,
                totalTax: item.cgst + item.sgst,
                grandTotal: item.grandTotal,
                invoices: item.invoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
            };
        });

        // The frontend expects a map/object keyed by "YYYY-MM"
        const summaryMap = formattedSummary.reduce((acc, curr) => {
            acc[curr.key] = curr;
            return acc;
        }, {});

        res.json(summaryMap);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/invoices - Create new invoice
router.post('/', async (req, res) => {
    const invoice = new Invoice(req.body);
    try {
        // Check if invoice number already exists
        const existing = await Invoice.findOne({ invoiceNumber: req.body.invoiceNumber });
        if (existing) {
            // If editing/updating logic involves POST to same ID? No, frontend usually separates PUT.
            // But let's fail if duplicate invoice number on create.
            return res.status(400).json({ message: 'Invoice number already exists' });
        }
        const newInvoice = await invoice.save();
        res.status(201).json(newInvoice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


// GET /api/invoices/:id - Get single invoice
router.get('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json(invoice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', async (req, res) => {
    try {
        // Handling custom ID vs MongoDB _id. The frontend sends the MongoDB _id usually if we loaded from DB.
        // If we are migrating from localStorage, IDs might be timestamps. 
        // Best to try finding by _id first, then maybe fallback or just stick to _id.
        // Since we are moving to MongoDB, we will use _id.
        const deleted = await Invoice.findByIdAndDelete(req.params.id);
        if (!deleted) {
            // Fallback: try finding by invoiceNumber if passed as ID (unlikely but safe) (OR "id" field if we stored it)
            // The schema has "invoiceNumber" unique.
            // Let's stick to Mongoose _id for standard deletes.
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.json({ message: 'Invoice deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
