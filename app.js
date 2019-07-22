var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('express-flash');
var logger = require('morgan');
var passport = require('passport');
var mongoose = require('mongoose');
var db = mongoose.connection;
var MongoStore = require('connect-mongo')(session);

var secret = require('./config/secret');
var Category = require('./model/Category');

var cartLength=require('./middlewares/middlewares');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
var apiRouter = require('./api/api');

var app = express();

// Map global promise - get rid of warning
mongoose.Promise = global.Promise;
// Connect to mongoose
mongoose.connect(secret.database, {
    useNewUrlParser: true
  })
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.log(err));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));

app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secret.secretKey,
  store: new MongoStore({
    url: secret.database,
    autoReconnect: true
  })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(cartLength);

app.use(flash());
// Globals
app.use(function (req, res, next) {
  // res.locals.messages=require('express-messages')(req,res);
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

app.get('*', function (req, res, next) {
  res.locals.user = req.user || null;
  next();
});

app.use(function (req, res, next) {
  Category.find({}, function (err, categories) {
    if (err) return next(err);
    res.locals.categories = categories;
    next();
  });
});

// Make our db accessible to our router
app.use(function (req, res, next) {
  req.db = db;
  next();
});

app.use("/public", express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);
app.use('/api',apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;