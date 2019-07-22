var express = require('express');
var router = express.Router();
var Category=require('../model/Category');

// GET - /admin/add-category
router.get('/add-category', function (req, res, next) {
    res.render('admin/add-category', {
        title: 'Add Category'
    });
});

// POST - /admin/add-category
router.post('/add-category',(req,res,next)=>{
    var category=new Category();
    category.name=req.body.name;

    category.save(function(err){
        if(err) return next(err);
        req.flash('success_msg','Successfully added new Category!');
        return res.redirect('/admin/add-category');
    });
});

module.exports = router;
