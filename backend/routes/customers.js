const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// GET /api/customers — List all customers
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ updatedAt: -1 });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch customers', error: err.message });
    }
});

// POST /api/customers — Create or update a customer (upsert by name)
router.post('/', async (req, res) => {
    try {
        const { name, address, gstin, state, stateCode } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Customer name is required' });
        }

        const customer = await Customer.findOneAndUpdate(
            { name: name.trim() },
            { name: name.trim(), address, gstin, state, stateCode },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(201).json(customer);
    } catch (err) {
        res.status(500).json({ message: 'Failed to save customer', error: err.message });
    }
});

// DELETE /api/customers/:id — Delete a single customer
router.delete('/:id', async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted', customer });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete customer', error: err.message });
    }
});

// DELETE /api/customers — Clear ALL customers
router.delete('/', async (req, res) => {
    try {
        const result = await Customer.deleteMany({});
        res.json({ message: `Deleted ${result.deletedCount} customers` });
    } catch (err) {
        res.status(500).json({ message: 'Failed to clear customers', error: err.message });
    }
});

module.exports = router;
