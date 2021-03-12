const path = require('path');
const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { Token } = require('../models/token.js');
const { customAlphabet } = require('nanoid');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

require('dotenv').config();

const nanoid = customAlphabet('1234567890abdefhijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVICE_HOST,
  port: process.env.MAIL_SERVICE_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// * home page
router.get('/', (req, res) => {
  let locals = {
    title: 'Afiye'
  };

  res.render(path.resolve(__dirname, '../views/index'), locals);
});

// * front matter press kit
router.get('/press-kit', (req, res) => {
  let locals = {
    title: 'Afiye - Press Kit',
  };

  res.render(path.resolve(__dirname, '../views/press-kit'), locals);
});

// * front matter case study
router.get('/case-study', (req, res) => {
  let locals = {
    title: 'Afiye - Case Study',
  };

  res.render(path.resolve(__dirname, '../views/case-study'), locals);
});

// * front matter team page
router.get('/team', (req, res) => {
  let locals = {
    title: 'Afiye - Meet the Team'
  };

  res.render(path.resolve(__dirname, '../views/team'), locals);
});

// * login page
router.get('/login', (req, res) => {
  let locals = {
    title: 'Afiye - Account Login'
  };

  res.render(path.resolve(__dirname, '../views/login'), locals);
});

// * register page
router.get('/register', (req, res) => {
  let locals = {
    title: 'Afiye - Sign Up'
  };

  res.render(path.resolve(__dirname, '../views/register'), locals);
});

// * register handle
router.post('/register', (req, res) => {
  const {firstName, lastName, email, password, password2} = req.body;
  let errors = [];

  if (!firstName || !lastName || !email || !password || !password2) {
    errors.push({msg: 'Please fill in all fields'});
  }

  // check if passwords match
  if (password !== password2) {
    errors.push({msg: 'Passwords don\'t match'});
  }

  // check if password is more than 6 characters
  if (password.length < 6) {
    errors.push({msg: 'Password must be at least 6 characters'});
  }

  if (errors.length > 0) {
    res.render(path.resolve(__dirname, '../views/register'), {
      errors: errors,
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      password2: password2,
      title: 'Afiye - Sign Up',
    });
  } else {
    // validation passed
    User.findOne({email: email}).exec((err, user) => {
      if (user) {
        errors.push({msg: 'Email is already registered'});
        res.render(path.resolve(__dirname, '../views/register'), {
          errors: errors,
          firstName: firstName,
          lastName: lastName,
          email: email,
          password: password,
          password2: password2,
          title: 'Afiye - Sign Up',
        });
      } else {
        const uid = 'u' + nanoid(); // db identifier for user
        const valToken = nanoid(); // email validation token
        // create email validation token in tokens collection
        const newToken = new Token({
          uid: uid,
          token: valToken
        });

        newToken.save()
          .catch(value => console.log(value));

        // create user document in users collection
        const newUser = new User({
          firstName: firstName,
          lastName: lastName,
          email: email,
          uid: uid,
          password: password
        });
        bcrypt.genSalt(10,(err,salt)=>
          bcrypt.hash(newUser.password,salt, (err,hash)=> {
            if(err) {
              throw err;
            } else {
              //save pass to hash
              newUser.password = hash;
            }

            //save user
            newUser.save()
              .catch(value=> console.log(value));
          }
        ));

        ejs.renderFile(__dirname + '/../views/email/emailConfirmation.ejs', { name: firstName, verifyLink: `${process.env.MAIL_DOMAIN}/verify/${uid}-${valToken}` }, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            let mainOptions = {
              from: '"noreply" <noreply@afiye.io>',
              to: email,
              subject: 'Afiye - Confirm Your Account',
              html: data
            };
            transporter.sendMail(mainOptions, (err, info) => {
              if (err) {
                console.log(err);
              } else {
                console.log('Message sent: ' + info.response);
              }
            });
          }
        });

        req.flash('success_msg', 'Check your email for a confimation message from us! Make sure to check your spam folder too');
        res.redirect(`/register/confirmation-${uid}`);
      }
    });
  }
});

// * Redirect page from successful sign up
router.get('/register/confirmation-:uid', (req, res) => {
  const uid = req.params.uid;
  const title = 'Afiye - Sign Up';
  let errors = [];

  User.findOne({ uid: uid }).exec((err, user) => {
    if (!user) {
      errors.push('We had trouble locating your account. Refresh the page, and if the problem persists try signing up again.');
      res.render(path.resolve(__dirname, '../views/register-confirmation'), {
        title: title,
        uid: uid,
        errors: errors,
      });
    } else {
      const firstName = user.firstName;
      const email = user.email;
      res.render(path.resolve(__dirname, '../views/register-confirmation'), {
        title: title,
        uid: uid,
        firstName: firstName,
        email: email,
      });
    }
  });
});

// * Resend registration verification from confirmation page
router.post('/register/confirmation-:uid', (req,res) => {
  const uid = req.params.uid;
  const title = 'Afiye - Sign Up';
  let errors = [];

  User.findOne({ uid: uid }).exec((err, user) => {
    if (!user) {
      errors.push('We had trouble locating your account. Refresh the page, and if the problem persists try signing up again.');
      res.render(path.resolve(__dirname, '../views/register-confirmation'), {
        title: title,
        uid: uid,
        errors: errors,
      });
    } else {
      const firstName = user.firstName;
      const email = user.email;
      Token.findOne({ uid: uid }).exec((err, token) => {
        if(!token) {
          errors.push('We had trouble locating your account. Refresh the page, and if the problem persists try signing up again.');
          res.render(path.resolve(__dirname, '../views/register-confirmation'), {
            title: title,
            uid: uid,
            errors: errors,
          });
        } else {
          const valToken = token.token;
          ejs.renderFile(__dirname + '/../views/email/emailConfirmation.ejs', { name: firstName, verifyLink: `${process.env.MAIL_DOMAIN}/verify/${uid}-${valToken}` }, (err, data) => {
            if (err) {
              console.log(err);
            } else {
              let mainOptions = {
                from: '"noreply" <noreply@afiye.io>',
                to: email,
                subject: 'Afiye - Confirm Your Account',
                html: data
              };
              transporter.sendMail(mainOptions, (err, info) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log('Message sent: ' + info.response);
                }
              });
            }
          });

          res.render(path.resolve(__dirname, '../views/register-confirmation'), {
            title: title,
            uid: uid,
            firstName: firstName,
            email: email,
            success_msg: 'Account confirmation message resent!'
          });
        }
      });
    }
  });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/account/feed',
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
});

router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You\'ve successfully logged out');
  res.redirect('/login');
});

router.get('/verify/:uid-:token', (req, res) => {
  let uid = req.params.uid,
      valToken = req.params.token;

  let errors = [];

  if (errors.length > 0) {
    res.render(path.resolve(__dirname, '../views/verify'), {
      errors: errors,
      title: 'Afiye - Account Verification',
      uid: uid,
      token: valToken,
    });
  } else {
    Token.findOne({uid: uid}).exec((err, token) => {
      if (!token) {
        errors.push({msg: 'Your account verification link has expired. <a>Resend link</a>'});
        res.render(path.resolve(__dirname, '../views/verify'), {
          errors: errors,
          title: 'Afiye - Account Verification',
          uid: uid,
          token: valToken,
        });
      } else {
        User.findOneAndUpdate({uid: uid},{ status: 'Active' },{new: true}).exec((err, user) => {
          if (!user) {
            errors.push({msg: 'We ran into a problem locating your account. Refresh the page or re-register for an account if the problem persists.'});
            res.render(path.resolve(__dirname, '../views/verify'), {
              errors: errors,
              title: 'Afiye - Account Verification',
              uid: uid,
              token: valToken,
            });
          } else {
            res.render(path.resolve(__dirname, '../views/verify'), {
              success_msg: 'Your account has been verified.',
              title: 'Afiye - Account Verification',
              uid: uid,
              token: valToken,
            });
            }
        });
      }
    });
  }
});

router.get('/downloads/:file-:ext', (req, res) => {
  let file = req.params.file,
      ext = req.params.ext,
      path = `../assets/downloads/${file}.${ext}`;

  res.download(__dirname, path);
});

module.exports = router;