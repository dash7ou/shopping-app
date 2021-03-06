const Product = require("../models/product");
const Order = require("../models/order");
const fs = require("fs");
const path = require("path");
const PDF = require("pdfkit");

const stripe = require("stripe")("sk_test_BMD9aaviqJzK0hlROg2KMRbD");

const ITEMS_PER_PAGE = 1;
exports.getProducts = (req, res, next) => {
  let page = 1;
  if (req.query.page) {
    page = +req.query.page;
  }
  Product.find()
    .countDocuments()
    .then(numberOfProduct => {
      totalItems = numberOfProduct;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products List",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products"
      });
    })
    .catch(err => console.log(err));
};

let totalItems = 0;
exports.getIndex = (req, res, next) => {
  let page = 1;
  if (req.query.page) {
    page = +req.query.page;
  }
  Product.find()
    .countDocuments()
    .then(numberOfProduct => {
      totalItems = numberOfProduct;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect("/cart");
    })
    .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
  const token = req.body.stripeToken;
  let totalSum = 0;

  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      user.cart.items.forEach(p => {
        totalSum += p.quantity * p.productId.price;
      });

      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      console.log(req.user);
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      const charge = stripe.charges.create({
        amount: totalSum * 100,
        currency: "usd",
        description: "Demo Order",
        source: token,
        metadata: { order_id: result._id.toString() }
      });
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then(orders => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders
      });
    })
    .catch(err => console.log(err));
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId).then(order => {
    if (!order) {
      return console.log("no Order found");
    }

    if (order.user.userId.toString() !== req.user._id.toString()) {
      return console.log("Unauthorized");
    }
    const invoiceName = "invoice-" + orderId + ".pdf";
    const invoicePath = path.join("data", "invoices", invoiceName);

    const pdfDoc = new PDF();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-DesPosition",
      "inline; filename='" + invoiceName + "' "
    );
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(30).text("Invoice");
    pdfDoc.text("---------------------------");
    let totalPrice = 0;
    order.products.forEach(p => {
      totalPrice += p.product.price * p.quantity;
      pdfDoc
        .fontSize(20)
        .text(`${p.product.title} : ${p.quantity}x - $ ${p.product.price}`);
    });
    pdfDoc.text("------");
    pdfDoc.fontSize(16).text(`Total price: ${totalPrice}`);
    pdfDoc.end();
  });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      let total = 0;
      const products = user.cart.items;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "CheckOut",
        products: products,
        totalSum: total
      });
    })
    .catch(err => console.log(err));
};
