const path = require('path');
const express = require('express');
const router = express.Router();
const {ensureAuthenticated} = require('../server/config/auth.js');
const User = require('../models/user.js');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('1234567890abdefhijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
const api = require('../server/neo4j.js');

// * user onboarding
router.get('/welcome', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Profile Setup',
    user: req.user
  };

  res.render(path.resolve(__dirname, '../views/onboarding'), locals);
});

router.post('/welcome', ensureAuthenticated, (req, res) => {
  const { mode } = req.body;
  if (mode === 'make-a-tree') {
    res.redirect('/account/welcome-make');
  } else {
    res.redirect('/account/welcome-join');
  }
});

// * user onboarding - make a tree
router.get('/welcome-make', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Making a Tree',
    user: req.user
  };

  res.render(path.resolve(__dirname, '../views/onboarding-make'), locals);
});

router.post('/welcome-make', ensureAuthenticated, (req, res) => {
  const { prefName, birthdate, gender, location, profileColor } = req.body;
  const user = req.user;
  const fid = nanoid();
  let errors = [];

  User.findOneAndUpdate({uid: user.uid},{fid: fid, node: true},{new: true}).exec((err, user) => {
    if (!user) {
      errors.push({msg: 'We ran into a problem locating your account. Refresh the page or re-register for an account if the problem persists.'});
      res.render(path.resolve(__dirname, '../views/onboarding-make'), {
        errors: errors,
        title: 'Afiye - Making a Tree',
        user: req.user
      });
    } else {
      const person = {
        uid: user.uid,
        fid: fid,
        firstName: user.firstName,
        prefName: prefName,
        lastName: user.lastName,
        birthdate: birthdate,
        gender: gender,
        location: location,
        profileColor: profileColor
      };

      // let locals = {
      //   title: 'Afiye - Making a Tree',
      //   user: req.user
      // };

      api.initFamily(person);

      // res.render(path.resolve(__dirname, '../views/onboarding-make'), locals);
      res.redirect('/account/feed');
    }
  });
});

// * user onboarding - join a tree
router.get('/welcome-join', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Joining a Tree',
    user: req.user
  };

  res.render(path.resolve(__dirname, '../views/onboarding-join'), locals);
});

// * user feed
router.get('/feed', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Memory Feed',
    user: req.user,
  };

  if (req.user.node === false) {
    res.redirect('/account/welcome');
  } else {
    res.render(path.resolve(__dirname, '../views/feed'), locals);
  }

});

// user post
router.get('/post', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Post',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/post'), locals);
});

// modal
// user post
router.get('/modal', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/modal'), locals);
});

// welcome
router.get('/welcome', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/welcome'), locals);
});

// Choosing between making or joining a tree
router.get('/choice', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/choice'), locals);
});

// making a tree
router.get('/makingtree', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/makingtree'), locals);
});

// create a profile
router.get('/createprofile', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/createprofile'), locals);
});

// user tree
router.get('/tree', ensureAuthenticated, (req, res) => {
  api.getData(req.user)
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

// * user profile
router.get('/profile', ensureAuthenticated, (req, res) => {
  let locals = {
    title: `Afiye - ${req.user.name}'s Profile`,
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/profile'), locals);
});

// * user settings
router.get('/settings', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Settings',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings'), locals);
});

// user settings
router.get('/settings-account', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Account Settings',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings-account'), locals);
});

// user settings
router.get('/settings-account-change-password', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Change Password',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings-account-change-password'), locals);
});

// user settings
router.get('/settings-account-leave-tree', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Leave Tree',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings-account-leave-tree'), locals);
});

router.get('/settings-account-deactivate', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Deactivate Account',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings-account-deactivate'), locals);
});

router.get('/settings-privacy', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Privacy Settings',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings-privacy'), locals);
});

router.get('/settings-accessibility', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Accessibility Options',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings-accessibility'), locals);
});


router.get('/settings-email', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Email Notifications',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/settings-email'), locals);
});

router.get('/tree-tutorial-1', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 1',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/tree-tutorial-1'), locals);
});

router.get('/tree-tutorial-2', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 2',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/tree-tutorial-2'), locals);
});

router.get('/tree-tutorial-3', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 3',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/tree-tutorial-3'), locals);
});

router.get('/tree-tutorial-4', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 4',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/tree-tutorial-4'), locals);
});

router.get('/tree-tutorial-5', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 5',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/tree-tutorial-5'), locals);
});

router.get('/tree-tutorial-6', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 6',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/tree-tutorial-6'), locals);
});

module.exports = router;