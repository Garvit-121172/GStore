//REQUIRING MODULES
require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const userSchema = require("./models/userSchema");
const prodSchema = require("./models/prodSchema");
const orderSchema = require("./models/orderSchema");
const jwt = require("jsonwebtoken");
const braintree = require("braintree")
if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}
const port = process.env.PORT || 3000;
const db_con_req = { useUnifiedTopology: true, useNewUrlParser: true };
const dblink1 = `mongodb+srv://${process.env.UNAME}:${process.env.PASS}@cluster0.8ro8q.mongodb.net/${process.env.DB_NAME1}?retryWrites=true&w=majority`;
mongoose.connect(dblink1, db_con_req).then(() => {
    console.log(" connect hogya");
}, (err) => {
    console.log(err);
});
const user = mongoose.model("user", userSchema);
const prod = mongoose.model("product", prodSchema);
const order = mongoose.model("order", orderSchema);



//MIDDLEWARES
app.use(bodyParser.urlencoded({ extended: false }))
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "/build/index.html")));

    app.get("/", async (req, res) => {
        const prods = await prod.find({ isFeatured: "true" }).exec();
        const prods2 = await prod.find({ isLatest: "true" }).exec();

        if (jwt.decode(localStorage.getItem("user_token"))) {
            var user_id = await jwt.decode(localStorage.getItem("user_token")).user_id;
            const user_obj = await user.findOne({ _id: user_id });
            res.render("home", { user_obj: user_obj, prod_array: prods, P_array: prods2 });
        }
        else {
            res.render("home", { prod_array: prods, P_array: prods2 })
        }
    });
    app.get("/allprod", async (req, res) => {
        var prods;
        prods = await prod.find({}).exec();
        if (localStorage.getItem("user_token")) {
            var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
            const user_obj = await user.findOne({ _id: user_id });
            res.render("allprod", { jo_dia: prods, user_obj: user_obj });
        }
        else {
            res.render("allprod", { jo_dia: prods });
        }
    })
    app.get("/allprod/category/:x", async (req, res) => {
        var prods;
        if (req.params.x == 1) {
            prods = await prod.find({ category: "Top" }).exec();
        }
        else if (req.params.x == 2) {
            prods = await prod.find({ category: "Bottom" }).exec();
        }
        else if (req.params.x == 3) {
            prods = await prod.find({ category: "Footwear" }).exec();
        }
        res.render("allprod", { jo_dia: prods });
    })
    app.get("/allprod/:x", async (req, res) => {
        var prods;
        if (req.params.x == 0) {
            prods = await prod.find({}).exec();
            res.render("allprod", { jo_dia: prods });
        }
        if (req.params.x == 1) {
            prods = await prod.find({}).sort({ price: 1 }).exec();
            res.render("allprod", { jo_dia: prods });
        }
        if (req.params.x == 2) {
            prods = await prod.find({}).exec();
            res.render("allprod", { jo_dia: prods });
        }
        if (req.params.x == 3) {
            prods = await prod.find({}).sort({ createdAt: -1 }).exec();
            res.render("allprod", { jo_dia: prods });
        }
    })
    app.get("/account", (req, res) => {
        res.render("account", {});
    })
    app.post("/account", async (req, res) => {
        var x = req.body;
        if (req.body.username) {
            x.pass = bcrypt.hashSync(req.body.pass, 10);
            const u = new user(x);
            await u.save();
            var u_token = jwt.sign({ user_id: u._id }, "mysecrettoken");
            localStorage.setItem("user_token", u_token);
            if (u.isAdmin) {
                res.redirect("admin/allprod");
            }
            else {
                res.redirect("/allprod");
            }

        }
        else {
            user.findOne({ mail: x.mail }, (err, aya) => {
                if (err) { console.log(err); }
                else {
                    if (aya) {
                        try {
                            const j = bcrypt.compareSync(x.pass, aya.pass);
                            if (j) {
                                var u_token = jwt.sign({ user_id: aya._id }, "mysecrettoken");
                                localStorage.setItem("user_token", u_token);
                                if (aya.isAdmin) {
                                    res.redirect("admin/allprod");
                                }
                                else {
                                    res.redirect("/allprod");
                                }

                            }//aage jake dashboard me profile complete krwa lena 
                            else { res.send("<h2>Invalid Credentials</h2>"); }
                        } catch (er) { console.log("koi err agyi"); }
                    }
                    else {
                        console.log("aisa koi user hi ni h");
                    }
                }
            })
        }
    });
    app.get("/cart", checkLogin, async (req, res) => {
        if (localStorage.getItem("user_token")) {
            var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
            const user_obj = await user.findOne({ _id: user_id });
            res.render("cart", { cart_array: user_obj.cart, user_obj: user_obj });
        }
        else {
            res.redirect("/account");
        }
    });
    function checkLogin(req, res, next) {
        if (jwt.decode(localStorage.getItem("user_token"))) {

            var tokn = localStorage.getItem("user_token");
            try {
                jwt.verify(tokn, "mysecrettoken");

            } catch (err) {
                res.redirect("/account");
            }
            next();
        }
        else {
            res.redirect("/account");
        }
    }
    app.get("/prod/:pr_id", async (req, res) => {
        const prods = await prod.find({ p_id: { $lte: 4 } }).exec();
        var pid = req.params.pr_id;
        prod.findById(pid, (err, p) => {
            res.render("product", { product: p, rel_array: prods });
        });
    });
    app.post("/prod/review/:p_id", checkLogin, async (req, res) => {
        var u_id = jwt.decode(localStorage.getItem("user_token"));
        var p = await prod.findById(req.params.p_id).exec();
        var rev_arr = p.reviews;
        var rev_obj = {
            rev_stars: req.body.rev_stars,
            rev_head: req.body.rev_head,
            rev_body: req.body.rev_body,
            user_id: u_id,
        }
        rev_arr.push(rev_obj);
        await p.updateOne({ reviews: rev_arr }).exec();
        res.redirect(`/prod/${req.params.p_id}`);
    })
    app.post("/add_to_cart/:prod_id", checkLogin, async (req, res) => {
        var flag = 0, flag1 = 0;
        var user_id = jwt.decode(localStorage.getItem("user_token"));
        const user_obj = await user.findById(user_id.user_id).exec();
        const prdct = await prod.findOne({ _id: req.params.prod_id });
        const dummy_cart = user_obj.cart;
        await dummy_cart.forEach(async (pr) => {
            if (pr._id.equals(prdct._id)) {
                flag = 1;
                pr.qty = pr.qty + parseInt(req.body.qty);
                pr.subtotal += pr.price * req.body.qty;
                if (pr.qty <= prdct.avl_qty) {
                    flag1 = 1;
                }
            }
        })
        if (flag == 1) {
            var olds_tot = user_obj.cart_total;
            olds_tot = olds_tot + prdct.price * req.body.qty;
            let bf_disc = await olds_tot + olds_tot * user_obj.tax + user_obj.dlvry;
            let af_disc = await bf_disc - bf_disc * user_obj.discount;
            user_obj.cart = dummy_cart;
            user_obj.grand_total = af_disc.toFixed(2);
            user_obj.cart_total = olds_tot;
            if (flag1 == 1) {
                await user_obj.updateOne({ cart: dummy_cart, grand_total: af_disc.toFixed(2), cart_total: olds_tot }).exec();
                res.redirect("/cart");
            }
            else {
                console.log("itni hai ni sorry");
            }
        }
        if (flag != 1) {
            const cart_item = {
                _id: prdct._id,
                p_id: prdct.p_id,
                p_name: prdct.p_name,
                p_img: prdct.p_img,
                brand: prdct.brand,
                qty: parseInt(req.body.qty),
                price: parseFloat(prdct.price),
                size: req.body.size,
                color: req.body.color,
                subtotal: parseFloat(prdct.price) * parseFloat(req.body.qty)
            }
            const old_cart = user_obj.cart;
            old_cart.push(cart_item)
            let olds_tot = user_obj.cart_total;
            olds_tot += cart_item.subtotal;
            let bf_disc = await olds_tot + olds_tot * user_obj.tax + user_obj.dlvry;
            let af_disc = await bf_disc - bf_disc * user_obj.discount;
            if (cart_item.qty <= prdct.avl_qty) {
                await user_obj.updateOne({ cart: old_cart, cart_total: olds_tot, grand_total: af_disc.toFixed(2) });
                res.redirect("/cart");
            }
            else {
                console.log("nhai ho payha");
            }
        }
    });
    app.post("/update_cart/:u_id/:p_id", async (req, res) => {
        const user_id = req.params.u_id;
        const prod_id = req.params.p_id;
        const prods = await prod.findById(prod_id);
        const user_obj = await user.findById(user_id);
        const old_cart = user_obj.cart;
        var oldc_tot = user_obj.cart_total;
        await old_cart.every((cart_item) => {
            if (cart_item._id == prod_id) {
                if (req.body.to_val != cart_item.qty && req.body.to_val <= prods.avl_qty) {
                    var old_qty = cart_item.qty;
                    cart_item.qty = parseInt(req.body.to_val);
                    cart_item.subtotal = parseFloat(cart_item.price) * parseInt(req.body.to_val);
                    oldc_tot += (req.body.to_val - old_qty) * parseFloat(cart_item.price);
                }

                else {
                    if (cart_item.qty + parseInt(req.body.new_val) <= prods.avl_qty) {
                        cart_item.qty += parseInt(req.body.new_val);
                        cart_item.subtotal += parseFloat(cart_item.price) * parseInt(req.body.new_val);
                        oldc_tot += parseFloat(cart_item.price) * parseInt(req.body.new_val);
                    }
                    else if (req.body.to_val > prods.avl_qty || cart_item.qty + parseInt(req.body.new_val) > prods.avl_qty) {
                        console.log("hai hi ni  itni");

                    }
                }
                return false;
            }

            return true;
        })
        var bf_disc = await oldc_tot + oldc_tot * user_obj.tax + user_obj.dlvry;
        var af_disc = await bf_disc - bf_disc * user_obj.discount;
        var new_cart = [];
        old_cart.every((c_item) => {
            if (c_item.qty <= 0) {
                return true;
            }
            else {
                new_cart.push(c_item);
                return true;
            }
        })
        if (new_cart.length == 0) {
            af_disc = 0;
        }
        await user_obj.updateOne({ cart: new_cart, cart_total: oldc_tot, grand_total: af_disc.toFixed(2) });
        await res.redirect("/cart");
    })
    app.get("/remove_from_cart/:p_id", checkLogin, async (req, res) => {
        var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
        const user_obj = await user.findOne({ _id: user_id });
        var new_cart = [];
        var oldc_tot = user_obj.cart_total;
        var oldg_tot = user_obj.grand_total;
        await user_obj.cart.every((c_item) => {
            if (c_item._id == req.params.p_id) {
                oldc_tot -= c_item.price * c_item.qty;
                oldg_tot -= c_item.price * c_item.qty;
                return true;
            }
            else {
                new_cart.push(c_item);
                return true;
            }
        })
        if (new_cart.length == 0) { oldg_tot = 0; }
        await user_obj.updateOne({ cart: new_cart, cart_total: oldc_tot, grand_total: oldg_tot.toFixed(2) });
        await res.redirect("/cart");

    })
    app.get("/admin/add_prod", checkLogin, async (req, res) => {
        res.render("add_prod", {});
    });
    function count_comma(x) {
        var cnt = 1, i;
        for (i = 0; i < x.length; i++) {
            if (x[i] == ",") {
                cnt++;
            }
        }
        return cnt;
    }
    app.post("/admin/add_prod", checkLogin, async (req, res) => {
        var t_array, size_array, c_array;
        t_array = req.body.tags.split(",", count_comma(req.body.tags));
        size_array = req.body.size_avl.split(",", count_comma(req.body.size_avl));
        c_array = req.body.colors.split(",", count_comma(req.body.colors));
        const new_prod = {
            p_id: parseInt(req.body.p_id),
            p_name: req.body.p_name,
            avl_qty: parseInt(req.body.avl_qty),
            price: parseInt(req.body.price),
            brand: req.body.brand,
            p_img: req.body.p_img,
            size_avl: size_array,
            category: req.body.category,
            tags: t_array,
            desc: req.body.desc,
            avg_rating: 0,
            colors: c_array,
            isFeatured: Boolean(parseInt(req.body.isFeatured)),
            isExclusive: Boolean(parseInt(req.body.isExclusive)),
            isLatest: Boolean(parseInt(req.body.isLatest))
        }
        const p = new prod(new_prod);
        await p.save();
        res.redirect("/admin/allprod");
    })
    app.get("/logout", (req, res) => {
        localStorage.removeItem("user_token");
        res.redirect("/");
    })
    app.get("/admin/allprod", (req, res) => {
        var prods;
        prod.find({}, (err, aya) => {
            prods = aya;
            res.render("admin_allprod", { jo_dia: prods });
        });
    })
    app.get("/admin/edit_prod/:p_id", async (req, res) => {
        const p_id = req.params.p_id;
        var p;
        p = await prod.findById(p_id).exec();
        res.render("edit_prod", { product: p })
    });
    app.get("/admin/remove_prod/:pid", async (req, res) => {
        await prod.deleteOne({ _id: req.params.pid });
        res.redirect("/admin/allprod");
    })
    app.post("/admin/edit_prod/:pid", async (req, res) => {
        var t_array, size_array, colors_array;
        t_array = req.body.tags.split(",", count_comma(req.body.tags));
        size_array = req.body.size_avl.split(",", count_comma(req.body.size_avl));
        colors_array = req.body.colors.split(",", count_comma(req.body.colors));
        const new_prod = {
            p_id: parseInt(req.body.p_id),
            p_name: req.body.p_name,
            avl_qty: parseInt(req.body.avl_qty),
            price: parseInt(req.body.price),
            brand: req.body.brand,
            p_img: req.body.p_img,
            size_avl: size_array,
            category: req.body.category,
            tags: t_array,
            desc: req.body.desc,
            colors: colors_array,
            isFeatured: Boolean(parseInt(req.body.isFeatured)),
            isExclusive: Boolean(parseInt(req.body.isExclusive)),
            isLatest: Boolean(parseInt(req.body.isLatest))

        }
        const p = await prod.findById(req.params.pid).exec();
        p.overwrite(new_prod);
        p.save();
        res.redirect("/admin/allprod");
    })
    app.post("/srch/", async (req, res) => {
        console.log(req.body);
        var product = await prod.findOne({ p_name: new RegExp('^' + req.body.input + '$', "i") }).exec();
        res.redirect(`/prod/${product._id}`);
    })
    app.get("/autocomplete", (req, res, next) => {
        var regex = new RegExp(req.query["term"], "i");
        var filterdprod = prod.find({ p_name: regex });//sort krke bhi dika ske on basis of creted/upadted/added..
        filterdprod.exec((err, data) => {
            var reslt = [];
            if (!err) {
                if (data && data.length > 0) {
                    data.forEach(p => {
                        let obj = {
                            id: p._id,
                            label: p.p_name
                        }
                        reslt.push(obj)
                    })
                }
            }
            res.jsonp(reslt);
        })
    })

    app.get("/init_pay", async (req, res) => {
        var gateway = new braintree.BraintreeGateway({
            environment: braintree.Environment.Sandbox,
            merchantId: process.env.MERCHANT_ID,
            publicKey: process.env.PUBLIC_KEY,
            privateKey: process.env.PRIVATE_KEY
        });
        let token = (gateway.clientToken.generate({})).clientToken;
        res.render("pay", { data: token })
    });
    app.post('/confirmBraintree', async (req, res) => {
        if (localStorage.getItem("user_token")) {
            var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
            var user_obj = await user.findOne({ _id: user_id });
        }
        var orderItem = {
            userId: user_id,
            orderedItems: user_obj.cart,
            subTotal: user_obj.cart_total,
            grandTotal: user_obj.grand_total,
            deleivery: user_obj.dlvry
        }

        var gateway = new braintree.BraintreeGateway({
            environment: braintree.Environment.Sandbox,
            merchantId: process.env.MERCHANT_ID,
            publicKey: process.env.PUBLIC_KEY,
            privateKey: process.env.PRIVATE_KEY
        });
        gateway.transaction.sale({
            amount: Math.round(user_obj.grand_total / 1000),
            paymentMethodNonce: req.body.nonce,
            options: {
                submitForSettlement: true
            }
        }, async (err, result) => {
            if (result.success) {
                orderItem.transacId = result.transaction.id;
                orderItem.orderStatus = "Confirmed";
                var orderObj = new order(orderItem);
                await orderObj.save();
                await user_obj.updateOne({ cart: [], grand_total: 0, cart_total: 0 });
                orderItem.orderedItems.forEach(async (product) => {
                    const newProd = await prod.findById(product._id).exec();
                    const newQty = newProd.avl_qty - product.qty;
                    await newProd.updateOne({ avl_qty: newQty });
                })
                res.send(result);
            } else {
                res.send(err);
            }
        });
    });
}

//LISTENING
app.listen(port, (req, res) => {
    localStorage.removeItem("user_token");
    console.log("started and listening ")
});



//ROUTING
app.get("/", async (req, res) => {
    const prods = await prod.find({ isFeatured: "true" }).exec();
    const prods2 = await prod.find({ isLatest: "true" }).exec();

    if (jwt.decode(localStorage.getItem("user_token"))) {
        var user_id = await jwt.decode(localStorage.getItem("user_token")).user_id;
        const user_obj = await user.findOne({ _id: user_id });
        res.render("home", { user_obj: user_obj, prod_array: prods, P_array: prods2 });
    }
    else {
        res.render("home", { prod_array: prods, P_array: prods2 })
    }
});
app.get("/allprod", async (req, res) => {
    var prods;
    prods = await prod.find({}).exec();
    if (localStorage.getItem("user_token")) {
        var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
        const user_obj = await user.findOne({ _id: user_id });
        res.render("allprod", { jo_dia: prods, user_obj: user_obj });
    }
    else {
        res.render("allprod", { jo_dia: prods });
    }
})
app.get("/allprod/category/:x", async (req, res) => {
    var prods;
    if (req.params.x == 1) {
        prods = await prod.find({ category: "Top" }).exec();
    }
    else if (req.params.x == 2) {
        prods = await prod.find({ category: "Bottom" }).exec();
    }
    else if (req.params.x == 3) {
        prods = await prod.find({ category: "Footwear" }).exec();
    }
    res.render("allprod", { jo_dia: prods });
})
app.get("/allprod/:x", async (req, res) => {
    var prods;
    if (req.params.x == 0) {
        prods = await prod.find({}).exec();
        res.render("allprod", { jo_dia: prods });
    }
    if (req.params.x == 1) {
        prods = await prod.find({}).sort({ price: 1 }).exec();
        res.render("allprod", { jo_dia: prods });
    }
    if (req.params.x == 2) {
        prods = await prod.find({}).exec();
        res.render("allprod", { jo_dia: prods });
    }
    if (req.params.x == 3) {
        prods = await prod.find({}).sort({ createdAt: -1 }).exec();
        res.render("allprod", { jo_dia: prods });
    }
})
app.get("/account", (req, res) => {
    res.render("account", {});
})
app.post("/account", async (req, res) => {
    var x = req.body;
    if (req.body.username) {
        x.pass = bcrypt.hashSync(req.body.pass, 10);
        const u = new user(x);
        await u.save();
        var u_token = jwt.sign({ user_id: u._id }, "mysecrettoken");
        localStorage.setItem("user_token", u_token);
        if (u.isAdmin) {
            res.redirect("admin/allprod");
        }
        else {
            res.redirect("/allprod");
        }

    }
    else {
        user.findOne({ mail: x.mail }, (err, aya) => {
            if (err) { console.log(err); }
            else {
                if (aya) {
                    try {
                        const j = bcrypt.compareSync(x.pass, aya.pass);
                        if (j) {
                            var u_token = jwt.sign({ user_id: aya._id }, "mysecrettoken");
                            localStorage.setItem("user_token", u_token);
                            if (aya.isAdmin) {
                                res.redirect("admin/allprod");
                            }
                            else {
                                res.redirect("/allprod");
                            }

                        }//aage jake dashboard me profile complete krwa lena 
                        else { res.send("<h2>Invalid Credentials</h2>"); }
                    } catch (er) { console.log("koi err agyi"); }
                }
                else {
                    console.log("aisa koi user hi ni h");
                }
            }
        })
    }
});
app.get("/cart", checkLogin, async (req, res) => {
    if (localStorage.getItem("user_token")) {
        var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
        const user_obj = await user.findOne({ _id: user_id });
        res.render("cart", { cart_array: user_obj.cart, user_obj: user_obj });
    }
    else {
        res.redirect("/account");
    }
});
function checkLogin(req, res, next) {
    if (jwt.decode(localStorage.getItem("user_token"))) {

        var tokn = localStorage.getItem("user_token");
        try {
            jwt.verify(tokn, "mysecrettoken");

        } catch (err) {
            res.redirect("/account");
        }
        next();
    }
    else {
        res.redirect("/account");
    }
}
app.get("/prod/:pr_id", async (req, res) => {
    const prods = await prod.find({ p_id: { $lte: 4 } }).exec();
    var pid = req.params.pr_id;
    prod.findById(pid, (err, p) => {
        res.render("product", { product: p, rel_array: prods });
    });
});
app.post("/prod/review/:p_id", checkLogin, async (req, res) => {
    var u_id = jwt.decode(localStorage.getItem("user_token"));
    var p = await prod.findById(req.params.p_id).exec();
    var rev_arr = p.reviews;
    var rev_obj = {
        rev_stars: req.body.rev_stars,
        rev_head: req.body.rev_head,
        rev_body: req.body.rev_body,
        user_id: u_id,
    }
    rev_arr.push(rev_obj);
    await p.updateOne({ reviews: rev_arr }).exec();
    res.redirect(`/prod/${req.params.p_id}`);
})
app.post("/add_to_cart/:prod_id", checkLogin, async (req, res) => {
    var flag = 0, flag1 = 0;
    var user_id = jwt.decode(localStorage.getItem("user_token"));
    const user_obj = await user.findById(user_id.user_id).exec();
    const prdct = await prod.findOne({ _id: req.params.prod_id });
    const dummy_cart = user_obj.cart;
    await dummy_cart.forEach(async (pr) => {
        if (pr._id.equals(prdct._id)) {
            flag = 1;
            pr.qty = pr.qty + parseInt(req.body.qty);
            pr.subtotal += pr.price * req.body.qty;
            if (pr.qty <= prdct.avl_qty) {
                flag1 = 1;
            }
        }
    })
    if (flag == 1) {
        var olds_tot = user_obj.cart_total;
        olds_tot = olds_tot + prdct.price * req.body.qty;
        let bf_disc = await olds_tot + olds_tot * user_obj.tax + user_obj.dlvry;
        let af_disc = await bf_disc - bf_disc * user_obj.discount;
        user_obj.cart = dummy_cart;
        user_obj.grand_total = af_disc.toFixed(2);
        user_obj.cart_total = olds_tot;
        if (flag1 == 1) {
            await user_obj.updateOne({ cart: dummy_cart, grand_total: af_disc.toFixed(2), cart_total: olds_tot }).exec();
            res.redirect("/cart");
        }
        else {
            console.log("itni hai ni sorry");
        }
    }
    if (flag != 1) {
        const cart_item = {
            _id: prdct._id,
            p_id: prdct.p_id,
            p_name: prdct.p_name,
            p_img: prdct.p_img,
            brand: prdct.brand,
            qty: parseInt(req.body.qty),
            price: parseFloat(prdct.price),
            size: req.body.size,
            color: req.body.color,
            subtotal: parseFloat(prdct.price) * parseFloat(req.body.qty)
        }
        const old_cart = user_obj.cart;
        old_cart.push(cart_item)
        let olds_tot = user_obj.cart_total;
        olds_tot += cart_item.subtotal;
        let bf_disc = await olds_tot + olds_tot * user_obj.tax + user_obj.dlvry;
        let af_disc = await bf_disc - bf_disc * user_obj.discount;
        if (cart_item.qty <= prdct.avl_qty) {
            await user_obj.updateOne({ cart: old_cart, cart_total: olds_tot, grand_total: af_disc.toFixed(2) });
            res.redirect("/cart");
        }
        else {
            console.log("nhai ho payha");
        }
    }
});
app.post("/update_cart/:u_id/:p_id", async (req, res) => {
    const user_id = req.params.u_id;
    const prod_id = req.params.p_id;
    const prods = await prod.findById(prod_id);
    const user_obj = await user.findById(user_id);
    const old_cart = user_obj.cart;
    var oldc_tot = user_obj.cart_total;
    await old_cart.every((cart_item) => {
        if (cart_item._id == prod_id) {
            if (req.body.to_val != cart_item.qty && req.body.to_val <= prods.avl_qty) {
                var old_qty = cart_item.qty;
                cart_item.qty = parseInt(req.body.to_val);
                cart_item.subtotal = parseFloat(cart_item.price) * parseInt(req.body.to_val);
                oldc_tot += (req.body.to_val - old_qty) * parseFloat(cart_item.price);
            }

            else {
                if (cart_item.qty + parseInt(req.body.new_val) <= prods.avl_qty) {
                    cart_item.qty += parseInt(req.body.new_val);
                    cart_item.subtotal += parseFloat(cart_item.price) * parseInt(req.body.new_val);
                    oldc_tot += parseFloat(cart_item.price) * parseInt(req.body.new_val);
                }
                else if (req.body.to_val > prods.avl_qty || cart_item.qty + parseInt(req.body.new_val) > prods.avl_qty) {
                    console.log("hai hi ni  itni");

                }
            }
            return false;
        }

        return true;
    })
    var bf_disc = await oldc_tot + oldc_tot * user_obj.tax + user_obj.dlvry;
    var af_disc = await bf_disc - bf_disc * user_obj.discount;
    var new_cart = [];
    old_cart.every((c_item) => {
        if (c_item.qty <= 0) {
            return true;
        }
        else {
            new_cart.push(c_item);
            return true;
        }
    })
    if (new_cart.length == 0) {
        af_disc = 0;
    }
    await user_obj.updateOne({ cart: new_cart, cart_total: oldc_tot, grand_total: af_disc.toFixed(2) });
    await res.redirect("/cart");
})
app.get("/remove_from_cart/:p_id", checkLogin, async (req, res) => {
    var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
    const user_obj = await user.findOne({ _id: user_id });
    var new_cart = [];
    var oldc_tot = user_obj.cart_total;
    var oldg_tot = user_obj.grand_total;
    await user_obj.cart.every((c_item) => {
        if (c_item._id == req.params.p_id) {
            oldc_tot -= c_item.price * c_item.qty;
            oldg_tot -= c_item.price * c_item.qty;
            return true;
        }
        else {
            new_cart.push(c_item);
            return true;
        }
    })
    if (new_cart.length == 0) { oldg_tot = 0; }
    await user_obj.updateOne({ cart: new_cart, cart_total: oldc_tot, grand_total: oldg_tot.toFixed(2) });
    await res.redirect("/cart");

})
app.get("/admin/add_prod", checkLogin, async (req, res) => {
    res.render("add_prod", {});
});
function count_comma(x) {
    var cnt = 1, i;
    for (i = 0; i < x.length; i++) {
        if (x[i] == ",") {
            cnt++;
        }
    }
    return cnt;
}
app.post("/admin/add_prod", checkLogin, async (req, res) => {
    var t_array, size_array, c_array;
    t_array = req.body.tags.split(",", count_comma(req.body.tags));
    size_array = req.body.size_avl.split(",", count_comma(req.body.size_avl));
    c_array = req.body.colors.split(",", count_comma(req.body.colors));
    const new_prod = {
        p_id: parseInt(req.body.p_id),
        p_name: req.body.p_name,
        avl_qty: parseInt(req.body.avl_qty),
        price: parseInt(req.body.price),
        brand: req.body.brand,
        p_img: req.body.p_img,
        size_avl: size_array,
        category: req.body.category,
        tags: t_array,
        desc: req.body.desc,
        avg_rating: 0,
        colors: c_array,
        isFeatured: Boolean(parseInt(req.body.isFeatured)),
        isExclusive: Boolean(parseInt(req.body.isExclusive)),
        isLatest: Boolean(parseInt(req.body.isLatest))
    }
    const p = new prod(new_prod);
    await p.save();
    res.redirect("/admin/allprod");
})
app.get("/logout", (req, res) => {
    localStorage.removeItem("user_token");
    res.redirect("/");
})
app.get("/admin/allprod", (req, res) => {
    var prods;
    prod.find({}, (err, aya) => {
        prods = aya;
        res.render("admin_allprod", { jo_dia: prods });
    });
})
app.get("/admin/edit_prod/:p_id", async (req, res) => {
    const p_id = req.params.p_id;
    var p;
    p = await prod.findById(p_id).exec();
    res.render("edit_prod", { product: p })
});
app.get("/admin/remove_prod/:pid", async (req, res) => {
    await prod.deleteOne({ _id: req.params.pid });
    res.redirect("/admin/allprod");
})
app.post("/admin/edit_prod/:pid", async (req, res) => {
    var t_array, size_array, colors_array;
    t_array = req.body.tags.split(",", count_comma(req.body.tags));
    size_array = req.body.size_avl.split(",", count_comma(req.body.size_avl));
    colors_array = req.body.colors.split(",", count_comma(req.body.colors));
    const new_prod = {
        p_id: parseInt(req.body.p_id),
        p_name: req.body.p_name,
        avl_qty: parseInt(req.body.avl_qty),
        price: parseInt(req.body.price),
        brand: req.body.brand,
        p_img: req.body.p_img,
        size_avl: size_array,
        category: req.body.category,
        tags: t_array,
        desc: req.body.desc,
        colors: colors_array,
        isFeatured: Boolean(parseInt(req.body.isFeatured)),
        isExclusive: Boolean(parseInt(req.body.isExclusive)),
        isLatest: Boolean(parseInt(req.body.isLatest))

    }
    const p = await prod.findById(req.params.pid).exec();
    p.overwrite(new_prod);
    p.save();
    res.redirect("/admin/allprod");
})
app.post("/srch/", async (req, res) => {
    console.log(req.body);
    var product = await prod.findOne({ p_name: new RegExp('^' + req.body.input + '$', "i") }).exec();
    res.redirect(`/prod/${product._id}`);
})
app.get("/autocomplete", (req, res, next) => {
    var regex = new RegExp(req.query["term"], "i");
    var filterdprod = prod.find({ p_name: regex });//sort krke bhi dika ske on basis of creted/upadted/added..
    filterdprod.exec((err, data) => {
        var reslt = [];
        if (!err) {
            if (data && data.length > 0) {
                data.forEach(p => {
                    let obj = {
                        id: p._id,
                        label: p.p_name
                    }
                    reslt.push(obj)
                })
            }
        }
        res.jsonp(reslt);
    })
})

app.get("/init_pay", async (req, res) => {
    var gateway = new braintree.BraintreeGateway({
        environment: braintree.Environment.Sandbox,
        merchantId: process.env.MERCHANT_ID,
        publicKey: process.env.PUBLIC_KEY,
        privateKey: process.env.PRIVATE_KEY
    });
    let token = (gateway.clientToken.generate({})).clientToken;
    res.render("pay", { data: token })
});
app.post('/confirmBraintree', async (req, res) => {
    if (localStorage.getItem("user_token")) {
        var user_id = jwt.decode(localStorage.getItem("user_token")).user_id;
        var user_obj = await user.findOne({ _id: user_id });
    }
    var orderItem = {
        userId: user_id,
        orderedItems: user_obj.cart,
        subTotal: user_obj.cart_total,
        grandTotal: user_obj.grand_total,
        deleivery: user_obj.dlvry
    }

    var gateway = new braintree.BraintreeGateway({
        environment: braintree.Environment.Sandbox,
        merchantId: process.env.MERCHANT_ID,
        publicKey: process.env.PUBLIC_KEY,
        privateKey: process.env.PRIVATE_KEY
    });
    gateway.transaction.sale({
        amount: Math.round(user_obj.grand_total / 1000),
        paymentMethodNonce: req.body.nonce,
        options: {
            submitForSettlement: true
        }
    }, async (err, result) => {
        if (result.success) {
            orderItem.transacId = result.transaction.id;
            orderItem.orderStatus = "Confirmed";
            var orderObj = new order(orderItem);
            await orderObj.save();
            await user_obj.updateOne({ cart: [], grand_total: 0, cart_total: 0 });
            orderItem.orderedItems.forEach(async (product) => {
                const newProd = await prod.findById(product._id).exec();
                const newQty = newProd.avl_qty - product.qty;
                await newProd.updateOne({ avl_qty: newQty });
            })
            res.send(result);
        } else {
            res.send(err);
        }
    });
});