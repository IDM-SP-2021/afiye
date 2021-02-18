const path = require('path');
const express = require('express');
const router = express.Router();
const {ensureAuthenticated} = require('../server/config/auth.js');

const api = require('../server/neo4j.js');

// user feed
router.get('/feed', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Memory Feed',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/feed'), locals);
});

router.get('/tree', ensureAuthenticated, (req, res) => {
  api.getData()
    .then((result) => {
      let locals = {
        title: 'Afiye - Family Tree',
        user: req.user,
        data: {
          user: {
            name: req.user.name
          },
          graph: result
        }
      };

      res.render(path.resolve(__dirname, '../views/tree'), locals);
    });
});

// user profile
router.get('/profile', ensureAuthenticated, (req, res) => {
  let locals = {
    title: `Afiye - ${req.user.name}'s Profile`,
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/profile'), locals);
});

// user settings
router.get('/settings', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Account Settings',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings'), locals);
});

module.exports = router;