const path = require('path');
const express = require('express');
const router = express.Router();

// login page
router.get('/', (req, res) => {
  let locals = {
    title: 'Afiye'
  };

  res.render(path.resolve(__dirname, '../views/index'), locals);
});

// register page
router.get('/register', (req, res) => {
  let locals = {
    title: 'Afiye - Register Account'
  };

  res.render(path.resolve(__dirname, '../views/register'), locals);
});

// front matter press kit
router.get('/press-kit', (req, res) => {
  let locals = {
    title: 'Afiye - Press Kit',
  };

  res.render(path.resolve(__dirname, '../views/press-kit'), locals);
});

// front matter case study
router.get('/case-study', (req, res) => {
  let locals = {
    title: 'Afiye - Case Study',
  };

  res.render(path.resolve(__dirname, '../views/case-study'), locals);
});

module.exports = router;