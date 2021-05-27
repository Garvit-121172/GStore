const mongoose = require("mongoose");
const prodSchema = new mongoose.Schema({
    p_name: String,
    size_avl: Array,
    avl_qty: Number,
    desc: String,
    reviews: Array,
    avg_rating: Number,
    price: Number,
    brand: String,
    category: String,
    p_id: Number,
    tags: Array,
    Gverfied: Boolean,
    discount: Number,
    colors: Array,
    p_img: String,
    pics: Array,
    avg_rating: Number,
    isLatest: Boolean,
    isFeatured: Boolean,
    isExclusive: Boolean
},
    {
        timestamps: true
    });
module.exports = prodSchema;