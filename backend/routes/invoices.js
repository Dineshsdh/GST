const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

// GET /api/invoices - Fetch paginated summary of invoices
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default limit
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        // Build query
        const query = {};
        if (search) {
            query.$or = [
                { invoiceNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch paginated invoices with lean and select only required fields
        const invoices = await Invoice.find(query)
            .select('invoiceNumber invoiceDate customerName grandTotal paymentStatus items') // include items temporarily to count them
            .sort({ invoiceDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate item counts without returning full items array
        const summaryInvoices = invoices.map(inv => ({
            _id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            customerName: inv.customerName,
            grandTotal: inv.grandTotal,
            paymentStatus: inv.paymentStatus,
            itemCount: inv.items ? inv.items.length : 0,
            // Keep items array briefly if frontend still expects it directly, 
            // but requirements say "summary fields only". We will map items just to length.
            // Returning the first 3 item descriptions could be useful if Frontend needs it:
            itemsSummary: inv.items ? inv.items.slice(0, 3).map(i => ({ description: i.description })) : []
        }));

        // Get total count for pagination
        const totalCount = await Invoice.countDocuments(query);

        res.json({
            invoices: summaryInvoices,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page
        });
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
