const path = require('path');
const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { Token } = require('../models/token.js');
const { Email } = require('../models/email.js');
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

const download = (req, res) => {
  const fileName = req.params.name;
  const directoryPath = __dirname + '/../public/assets/downloads/';

  res.download(directoryPath + fileName, fileName, (err) => {
    if (err) {
      res.status(500).send({
        message: "Could not download the file. " + err,
      });
    }
  });
};

// * home page
router.get('/', (req, res) => {
  let locals = {
    title: 'Afiye'
  };

  res.render(path.resolve(__dirname, '../views/front/index'), locals);
});

// * front matter press kit
router.get('/press-kit', (req, res) => {
  let locals = {
    title: 'Afiye - Press Kit',
  };

  if (req.isAuthenticated()) {
    locals.auth = true;
    locals.user = req.user;
  } else {
    locals.auth = false;
  }

  res.render(path.resolve(__dirname, '../views/front/press-kit'), locals);
});

// * front matter case study
router.get('/case-study', (req, res) => {
  let locals = {
    title: 'Afiye - Case Study',
  };

  if (req.isAuthenticated()) {
    locals.auth = true;
    locals.user = req.user;
  } else {
    locals.auth = false;
  }

  res.render(path.resolve(__dirname, '../views/front/case-study'), locals);
});

// * front matter team page
router.get('/team', (req, res) => {
  let locals = {
    title: 'Afiye - Meet the Team'
  };

  if (req.isAuthenticated()) {
    locals.auth = true;
    locals.user = req.user;
  } else {
    locals.auth = false;
  }

  res.render(path.resolve(__dirname, '../views/front/team'), locals);
});

// * login page
router.get('/login', (req, res) => {
  let locals = {
    title: 'Afiye - Account Login'
  };

  res.render(path.resolve(__dirname, '../views/front/login'), locals);
});

// * register page
router.get('/register', (req, res) => {
  let locals = {
    title: 'Afiye - Sign Up'
  };

  res.render(path.resolve(__dirname, '../views/front/register'), locals);
});

// * register handle
router.post('/register', (req, res) => {
  const { firstName, lastName, email, password, password2 } = req.body;
  let errors = [];
  let em = email.toLowerCase();

  if (!firstName || !lastName || !email || !password || !password2) {
    errors.push({ msg: 'Please fill in all fields' });
  }

  // check if passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords don\'t match' });
  }

  // check if password is more than 6 characters
  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render(path.resolve(__dirname, '../views/front/register'), {
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
    User.findOne({ email: em }).exec((err, user) => {
      if (user) {
        errors.push({ msg: 'Email is already registered' });
        res.render(path.resolve(__dirname, '../views/front/register'), {
          errors: errors,
          firstName: firstName,
          lastName: lastName,
          email: em,
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
          token: valToken,
          type: 'account'
        });

        newToken.save()
          .catch(value => console.log(value));
        // create user document in users collection
        const newUser = new User({
          firstName: firstName,
          lastName: lastName,
          email: em,
          uid: uid,
          password: password
        });
        bcrypt.genSalt(10, (err, salt) =>
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) {
              throw err;
            } else {
              //save pass to hash
              newUser.password = hash;
            }

            //save user
            newUser.save()
              .catch(value => console.log(value));
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
      res.render(path.resolve(__dirname, '../views/front/register-confirmation'), {
        title: title,
        uid: uid,
        errors: errors,
      });
    } else {
      const firstName = user.firstName;
      const email = user.email;
      res.render(path.resolve(__dirname, '../views/front/register-confirmation'), {
        title: title,
        uid: uid,
        firstName: firstName,
        email: email,
      });
    }
  });
});

// * Resend registration verification from confirmation page
router.post('/register/confirmation-:uid', (req, res) => {
  const uid = req.params.uid;
  const title = 'Afiye - Sign Up';
  let errors = [];

  User.findOne({ uid: uid }).exec((err, user) => {
    if (!user) {
      errors.push('We had trouble locating your account. Refresh the page, and if the problem persists try signing up again.');
      res.render(path.resolve(__dirname, '../views/front/register-confirmation'), {
        title: title,
        uid: uid,
        errors: errors,
      });
    } else {
      const firstName = user.firstName;
      const email = user.email;
      Token.findOne({ uid: uid, type: 'account' }).exec((err, token) => {
        if (!token) {
          errors.push('We had trouble locating your account. Refresh the page, and if the problem persists try signing up again.');
          res.render(path.resolve(__dirname, '../views/front/register-confirmation'), {
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

          res.render(path.resolve(__dirname, '../views/front/register-confirmation'), {
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
    res.render(path.resolve(__dirname, '../views/front/verify'), {
      errors: errors,
      title: 'Afiye - Account Verification',
      uid: uid,
      token: valToken,
    });
  } else {
    Token.findOne({ uid: uid, type: 'account' }).exec((err, token) => {
      if (!token || token.token !== valToken) {
        errors.push({ msg: 'expired' });
        res.render(path.resolve(__dirname, '../views/front/verify'), {
          errors: errors,
          title: 'Afiye - Account Verification',
          uid: uid,
          token: valToken,
        });
      } else {
        User.findOneAndUpdate({ uid: uid }, { status: 'Active' }, { new: true }).exec((err, user) => {
          if (!user) {
            errors.push({ msg: 'locate' });
            res.render(path.resolve(__dirname, '../views/front/verify'), {
              errors: errors,
              title: 'Afiye - Account Verification',
              uid: uid,
              token: valToken,
            });
          } else {
            res.render(path.resolve(__dirname, '../views/front/verify'), {
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

router.post('/verify/:uid-:token', (req, res) => {
  const uid = req.params.uid;
  const token = req.params.token;
  const title = 'Account Verification';
  let errors = [];

  User.findOne({ uid: uid }).exec((err, user) => {
    if (!user) {
      errors.push({ msg: 'locate' });
      res.render(path.resolve(__dirname, '../views/front/verify'), {
        title: title,
        uid: uid,
        errors: errors,
      });
    } else {
      const firstName = user.firstName;
      const email = user.email;
      const valToken = nanoid(); // email validation token
      // create email validation token in tokens collection
      const newToken = new Token({
        uid: uid,
        token: valToken,
        type: 'account'
      });

      newToken.save()
        .catch(value => console.log(value));

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

      res.render(path.resolve(__dirname, '../views/front/verify'), {
        title: title,
        uid: uid,
        token: token,
        success_msg: 'Account confirmation message resent!'
      });
    }
  });
});

router.get('/downloads/:file-:ext', (req, res) => {
  let file = req.params.file,
    ext = req.params.ext,
    path = `../assets/downloads/${file}.${ext}`;

  res.download(__dirname, path);
});

router.get('/password-reset', (req, res) => {
  let locals = {
    title: 'Afiye - Reset Password'
  };

  res.render(path.resolve(__dirname, '../views/front/forgotpwd'), locals);
});

router.post('/password-reset', (req, res) => {
  const { email } = req.body;
  let errors = [];
  const title = 'Afiye - Reset Password';

  User.findOne({ email: email }).exec((err, user) => {
    if (!user) {
      errors.push({ msg: 'That email is not registered.' });
      res.render(path.resolve(__dirname, '../views/front/forgotpwd'), {
        title,
        errors,
      });
    } else {
      const uid = user.uid;
      const email = user.email;
      const valToken = nanoid(); // email validation token
      // create email validation token in tokens collection
      const newToken = new Token({
        uid: uid,
        token: valToken,
        type: 'password'
      });

      newToken.save()
        .catch(value => console.log(value));

      ejs.renderFile(__dirname + '/../views/email/passwordReset.ejs', { verifyLink: `${process.env.MAIL_DOMAIN}/password-reset/${uid}-${valToken}` }, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          let mainOptions = {
            from: '"noreply" <noreply@afiye.io>',
            to: email,
            subject: 'Afiye - Reset your password',
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

      res.render(path.resolve(__dirname, '../views/front/emailsent'), {
        title,
        uid: uid,
        success_msg: `Password reset link sent to ${email}!`
      });
    }
  });
});

router.get('/password-reset/:uid-:valToken', (req, res) => {
  const { uid, valToken } = req.params;

  Token.findOne({ uid: uid, type: 'password' }).exec((err, token) => {
    if (!token || token.token !== valToken) {
      res.redirect('/password-reset');
    } else {
      res.render(path.resolve(__dirname, '../views/front/password-reset-form'), {
        title: 'Afiye - Password Reset',
        uid,
        valToken
      });
    }
  });
});

router.post('/password-reset/:uid-:valToken', (req, res) => {
  const { uid, valToken } = req.params,
    { password, password2 } = req.body;
  let errors = [];

  // check if passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords don\'t match' });
  }

  // check if password is more than 6 characters
  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render(path.resolve(__dirname, '../views/front/password-reset-form'), {
      errors,
      title: 'Afiye - Password Reset',
      uid,
      valToken
    });
  } else {
    bcrypt.genSalt(10, (err, salt) =>
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          throw err;
        } else {
          User.findOneAndUpdate({ uid: uid }, { password: hash }, { new: true }).exec((err, user) => {
            if (!user) {
              errors.push({ msg: 'locate' });
              res.render(path.resolve(__dirname, '../views/front/password-reset-form'), {
                errors,
                title: 'Afiye - Password Reset',
                uid,
                valToken
              });
            } else {
              res.render(path.resolve(__dirname, '../views/front/password-reset-form'), {
                success_msg: 'Your password has been successfully reset!',
                title: 'Afiye - Password Reset',
                uid,
                valToken
              });
            }
          });
        }
      }
    ));
  }
});

router.get('/update-email/:uid-:verToken', (req, res) => {
  const { uid, verToken } = req.params;

  Email.findOne({ uid: uid }).exec((err, token) => {
    if (!token || token.token !== verToken) {
      res.redirect('/login');
    } else {
      res.render(path.resolve(__dirname, '../views/front/update-email'), {
        title: 'Afiye - Update Email',
        uid,
        verToken
      });
    }
  });
});

router.post('/update-email/:uid-:verToken', (req, res) => {
  const { uid, verToken } = req.params,
        { code } = req.body;

  let errors = [];

  Email.findOne({uid: uid, token: verToken}).exec((err, token) => {
    if (!token) {
      errors.push({msg: 'Invalid validation token'});
      res.render(path.resolve(__dirname, '../views/front/update-email'), {
        errors,
        title: 'Afiye - Update Email',
        uid,
        verToken
      });
    } else if (token.code !== code) {
      errors.push({msg: 'Verification code is incorrect'});
      res.render(path.resolve(__dirname, '../views/front/update-email'), {
        errors,
        title: 'Afiye - Update Email',
        uid,
        verToken
      });
    } else if (token.code === code) {
      User.findOneAndUpdate({uid: uid}, {email: token.email}, {new: true}).exec((err, user) => {
        console.log('Updated email');
        if (!user) {
          console.log('Cannot locate user');
          errors.push({msg: 'locate'});
          res.render(path.resolve(__dirname, '../views/front/update-email'), {
            errors,
            title: 'Afiye - Update Email',
            uid,
            verToken
          });
        } else {
          console.log('Updating complete');
          Email.findOneAndDelete({uid: uid}).exec(() => {
            res.render(path.resolve(__dirname, '../views/front/update-email'), {
              success_msg: 'Your email has been updated',
              title: 'Afiye - Update Email',
              uid,
              verToken
            });
          });
        }
      });
    }
  });
});

router.get('/downloads/:name', download);

module.exports = router;