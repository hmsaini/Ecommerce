var express = require('express');
var router = express.Router();
var async = require('async');
var passport = require('passport');
var passportConf = require('../config/passport');

var User = require('../model/User');
var Cart = require('../model/Cart');

// GET - /users/login
router.get('/login', (req, res, next) => {
  res.render('accounts/login', {
    title: 'Log In'
  });
});

// POST - /users/login
router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/users/profile',
  failureRedirect: '/users/login',
  failureFlash: true
}));

// GET - /users/signup
router.get('/signup', function (req, res, next) {
  res.render('accounts/signup', {
    title: 'Sign Up'
  });
});

// POST - /users/signup
router.post('/signup', (req, res, next) => {
  async.waterfall([
    function (callback) {
      var user = new User();

      user.profile.name = req.body.name;
      user.password = req.body.password;
      user.email = req.body.email;
      user.profile.picture = user.gravatar();

      User.findOne({
        email: req.body.email
      }, function (err, existingUser) {
        if (existingUser) {
          req.flash('error_msg', 'Account with that email address already exists');
          return res.redirect('/users/signup');
        } else {
          user.save(function (err) {
            if (err) return next(err);
            callback(null, user);

            // req.flash('success_msg', 'Account created successfully!');
            // // return res.redirect('/');


          });
        }
      });
    },
    function (user) {
      var cart = new Cart();
      cart.owner = user._id;
      cart.save(function (err) {
        if (err) return next(err);

        req.logIn(user, function (err) {
          if (err) return next(err);
          res.redirect('/users/profile');

        });
      });
    }
  ]);
});

// GET - /users/profile
router.get('/profile', passportConf.isAuthenticated, (req, res, next) => {
  User
    .findOne({
      _id: req.user._id
    })
    .populate('history.item')
    .exec(function (err, foundUser) {
      if (err) return next(err);

      let record=foundUser.history;

      res.render('accounts/profile', {
        user: foundUser,
        record:record,
        title: 'Profile'
      });
    }); 
});

// GET - /users/edit-profile
router.get('/edit-profile', (req, res, next) => {
  res.render('accounts/edit-profile', {
    title: 'Edit Profile'
  });
});

// POST - /users/edit-profile
router.post('/edit-profile', (req, res, next) => {
  User.findOne({
    _id: req.user._id
  }, function (err, user) {
    if (err) return next(err);

    if (req.body.name) user.profile.name = req.body.name;
    if (req.body.address) user.address = req.body.address;

    user.save(function (err) {
      if (err) return next(err);
      req.flash('success_msg', 'Profile Updated!');
      return res.redirect('/users/profile');
    });
  });
});

// GET - /users/logout
router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;