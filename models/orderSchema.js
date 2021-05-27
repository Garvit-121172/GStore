const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
    transacId: String,
    orderStaus: String,
    orderedItems: Array,
    userId: String,
    grandTotal: Number,
    subTotal: Number,
    deleivery: Number,
},
    {
        timestamps: true
    });
module.exports = orderSchema;