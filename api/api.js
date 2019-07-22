var router = require('express').Router();
var async = require('async');
var faker = require('faker');
var Category = require('../model/Category');
var Product = require('../model/Product');


// localhost:3000/api/search
router.post('/search', (req, res, next) => {
    console.log(req.body.search_term);
    Product.search({
        query_string: {
            query: req.body.search_term
        }
    }, function (err, results) {
        if (err) return next(err);
        res.json(results);
    });
});


// localhost:3000/api/foods     - create 30 items under food
router.get('/:name', (req, res, next) => {
    async.waterfall([
        function (callback) {
            Category.findOne({
                name: req.params.name
            }, function (err, category) {
                if (err) return next(err);

                callback(null, category);
            })
        },

        function (category, callback) {
            for (let i = 0; i < 30; i++) {
                var product = new Product();
                product.category = category._id;
                product.name = faker.commerce.productName();
                product.price = faker.commerce.price();
                product.image = faker.image.image();

                product.save();

            }
        }
    ]);

    res.json({
        message: 'Success'
    });
});

module.exports = router;