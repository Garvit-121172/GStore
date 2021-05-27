const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    f_name: String,
    l_name: String,
    username: String,
    mail: String,
    pass: String,
    phone: Number,
    cart: Array,
    wishlist: Array,
    cart_total: { type: Number, default: 0 },
    dlvry: { type: Number, default: 50 },
    discount: { type: Number, default: 0.03 },
    tax: { type: Number, default: 0.07 },
    grand_total: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false }
});
module.exports = userSchema;
