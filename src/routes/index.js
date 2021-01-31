const path = require('path');
const express = require('express');
const router = express.Router();
const {ensureAuthenticated} = require('../server/config/auth.js');

// login page
router.get('/', (req, res) => {
  res.render( path.resolve(__dirname, '../views/welcome'));
});

// register page
router.get('/register', (req, res) => {
  res.render('../views/register');
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render(path.resolve(__dirname, '../views/dashboard'), {
    user: req.user
  });
});

module.exports = router;