import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import expressEjsLayout from 'express-ejs-layouts';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';

require('dotenv').config();
require('./config/passport')(passport);

const app = express();

app.use(express.static(path.resolve(__dirname, '../public')));

//mongoose
mongoose.connect(process.env.MONGO_HOST,
  {
    useNewUrlParser: true,
    useUnifiedTopology : true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
.then(() => console.log('connected to mongoDB..'))
.catch((err)=> console.log(err));

//EJS
app.set('view engine','ejs');
app.use(expressEjsLayout);
//BodyParser
app.use(express.urlencoded({extended : false}));

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// use flash
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');

  next();
});

// Layout
app.set('layout', path.resolve(__dirname, '../views/layout'));

//Routes
app.use('/', require('../routes/index'));
app.use('/account',require('../routes/account'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  console.log(`Press CTRL + C to close...`);
});