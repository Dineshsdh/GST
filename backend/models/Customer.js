const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Customer name is required'],
            trim: true,
        },
        address: {
            type: String,
            trim: true,
            default: '',
        },
        gstin: {
            type: String,
            trim: true,
            default: '',
        },
        state: {
            type: String,
            trim: true,
            default: '',
        },
        stateCode: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Index on name for quick lookup and upsert
customerSchema.index({ name: 1 });

module.exports = mongoose.model('Customer', customerSchema);
