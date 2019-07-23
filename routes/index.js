var express = require('express');
var router = express.Router();

var User = require('../model/User');
var Product = require('../model/Product');
var Category = require('../model/Category');
var Cart = require('../model/Cart');

var async = require('async');

var stripe = require('stripe')('sk_test_A3LjBI8NZuvTYGrqia1OzcGM');

// Mapping for elastic search
Product.createMapping(function (err, mapping) {
  if (err) {
    console.log('error creating mapping ' + err);
  } else {
    console.log('Mapping Created');
    console.log(mapping);
  }
});

var stream = Product.synchronize();
var count = 0;

stream.on('data', function () {
  count++;
});

stream.on('close', function () {
  console.log("Indexed " + count + " documents");
});

stream.on('error', function (err) {
  console.log(err);
});


function paginate(req, res, next) {
  var perPage = 9;
  var page = req.params.page;

  Product.find()
    .skip(perPage * page)
    .limit(perPage)
    .populate('category')
    .exec(function (err, products) {
      if (err) return next(err);
      Product.count().exec(function (err, count) {
        if (err) return next(err);

        res.render('main/product-main', {
          title: 'Shopping Website',
          products: products,
          pages: count / perPage
        });
      });
    });
}

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.user) {
    paginate(req, res, next);
  } else {
    res.render('index', {
      title: 'Shopping Website'
    });
  }
});

router.get('/cart', function (req, res, next) {
  Cart
    .findOne({
      owner: req.user._id
    })
    .populate('items.item')
    .exec(function (err, foundCart) {

      let products = foundCart.items;

      if (err) return next(err);
      res.render('main/cart', {
        foundCart: foundCart,
        products: products,
        title: 'Cart'
      });
    });
});

router.post('/search', (req, res, next) => {
  res.redirect('/search?q=' + req.body.q);
});

router.get('/search', (req, res, next) => {
  if (req.query.q) {
    Product.search({
      query_string: {
        query: req.query.q
      }
    }, function (err, results) {
      if (err) return next(err);
      var data = results.hits.hits.map(function (hit) {
        return hit;
      });
      res.render('main/search-result', {
        query: req.query.q,
        data: data
      });
    });
  }
});

router.get('/page/:page', (req, res, next) => {
  paginate(req, res, next);
});

// GET - /products/id  - it will show all the products under that category
router.get('/products/:id', (req, res, next) => {
  Product.find({
      category: req.params.id
    })
    .populate('Category')
    .exec(function (err, products) {
      if (err) return next(err);

      res.render('main/category', {
        products: products
      });
    });
});

// GET - /product/id  - it will show only single product
router.get('/product/:id', (req, res, next) => {
  Product.findById({
    _id: req.params.id
  }, function (err, product) {
    if (err) return next(err);

    res.render('main/product', {
      product: product
    });
  });
});

// POST - /product/id - perform PLUS MINUS ADD TO CART
router.post('/product/:product_id', (req, res, next) => {
  Cart.findOne({
    owner: req.user._id
  }, function (err, cart) {
    cart.items.push({
      item: req.body.product_id,
      price: parseFloat(req.body.priceValue),
      quantity: parseInt(req.body.quantity)
    });

    cart.total = (cart.total + parseFloat(req.body.priceValue)).toFixed(2);

    cart.save(function (err) {
      if (err) return next(err);
      return res.redirect('/cart');
    });
  });
});

// POST - /remove - to remove item from CART
router.post('/remove', (req, res, next) => {
  Cart.findOne({
    owner: req.user._id
  }, function (err, foundCart) {
    if (err) return next(err);

    foundCart.items.pull(String(req.body.item));

    foundCart.total = (foundCart.total - parseFloat(req.body.price)).toFixed(2);
    foundCart.save(function (err, found) {
      if (err) return next(err);

      req.flash('success_msg', 'Successfully removed!');
      res.redirect('/cart');
    });
  });
});

// POST - /payment  - STRIPE PAYMENT
router.post('/payment', (req, res, next) => {
  var stripeToken = req.body.stripeToken;
  console.log(stripeToken);
  var currentCharges = Math.round(req.body.stripeMoney * 100);

  stripe.customers.create({
      source: stripeToken
    })
    .then(function (customer) {
      return stripe.charges.create({
        amount: currentCharges,
        currency: 'usd',
        customer: customer.id
      });
    })
    .then(function (charge) {
      async.waterfall([
        function (callback) {
          Cart.findOne({
            owner: req.user._id
          }, function (err, cart) {
            callback(err, cart);
          });
        },
        function (cart,callback) {
          User.findOne({
            _id: req.user._id
          }, function (err, user) {
            if (user) {
              for (let i = 0; i < cart.items.length; i++) {
                user.history.push({
                  item: cart.items[i].item,
                  paid: cart.items[i].price
                });
              }

              user.save(function (err, user) {
                if (err) return next(err);
                callback(err, user);
              });
            }
          });
        },
        function (user) {
          Cart.update({
            owner: user._id
          }, {
            $set: {
              items: [],
              total: 0
            }
          }, function (err, updated) {
            if (updated) {
              res.redirect('/users/profile');
            }
          });
        }
      ]);
    });
});

module.exports = router;