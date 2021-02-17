const path = require('path');
const express = require('express');
const router = express.Router();
const ejs = require('ejs');
const nodemailer = require('nodemailer');

require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVICE_HOST,
  port: process.env.MAIL_SERVICE_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

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

module.exports = router;