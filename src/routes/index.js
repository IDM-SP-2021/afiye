const path = require('path');
const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const bcrypt = require('bcrypt');
const { render } = require('sass');
const passport = require('passport');

require('dotenv').config();

// * Example email structure
// router.get('/test', (req, res) => {
//   ejs.renderFile(__dirname + '/../views/email/test.ejs', {name: 'Ben'}, (err, data) => {
//     if (err) {
//       console.log(err);
//     } else {
//       let mainOptions = {
//         from: '"noreply" <noreply@afiye.io>',
//         to: "sutramkire@gmail.com",
//         subject: 'Pretty!',
//         html: data
//       };
//       console.log("html data =========================>", mainOptions.html);
//       transporter.sendMail(mainOptions, (err, info) => {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log('Message sent: ' + info.response);
//         }
//       });
//     }
//   });
//   res.end();
// });

// * login page
router.get('/', (req, res) => {
  let locals = {
    title: 'Afiye'
  };

  res.render(path.resolve(__dirname, '../views/index'), locals);
});

// * register page
router.get('/register', (req, res) => {
  let locals = {
    title: 'Afiye - Register Account'
  };

  res.render(path.resolve(__dirname, '../views/register'), locals);
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

// login handle
router.get('/login', (req, res) => {
  let locals = {
    title: 'Afiye - Account Login'
  };

  res.render(path.resolve(__dirname, '../views/login'), locals);
});
router.get('/register', (req, res) => {
  let locals = {
    title: 'Afiye - Register Account'
  };

  res.render(path.resolve(__dirname, '../views/register'), locals);
});

// register handle
router.post('/register', (req, res) => {
  const {name, email, password, password2} = req.body;
  let errors = [];

  console.log(`Name: ${name} email: ${email} pass: ${password}`);

  if (!name || !email || !password || !password2) {
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
      name: name,
      email: email,
      password: password,
      password2: password2,
      title: 'Afiye - Register Account',
    });
  } else {
    // validation passed
    User.findOne({email: email}).exec((err, user) => {
      console.log(user);
      if (user) {
        errors.push({msg: 'Email is already registered'});
        render(res, errors, name, email, password, password2);
      } else {
        const newUser = new User({
          name: name,
          email: email,
          password: password
        });
        bcrypt.genSalt(10,(err,salt)=>
            bcrypt.hash(newUser.password,salt,
                (err,hash)=> {
                    if(err) {
                      throw err;
                    } else {
                      //save pass to hash
                      newUser.password = hash;
                    }

                    //save user
                    newUser.save()
                    .then((value)=>{
                      console.log(value);
                      req.flash('success_msg', 'You have now registered!');
                      res.redirect('/account/login');
                    })
                    .catch(value=> console.log(value));
                }));
      }
    });
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/account/feed',
    failureRedirect: '/account/login',
    failureFlash: true,
  })(req, res, next);
});

router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You\'ve successfully logged out');
  res.redirect('/login');
});

module.exports = router;