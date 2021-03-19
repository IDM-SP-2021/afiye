const path = require('path');
const express = require('express');
const router = express.Router();
const {ensureAuthenticated} = require('../server/config/auth.js');
const User = require('../models/user.js');
const Post = require('../models/post.js');
const Album = require('../models/album.js');
const {Invite} = require('../models/invite.js');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('1234567890abdefhijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
const nanoinv = customAlphabet('1234567890', 6);
const api = require('../server/neo4j.js');
const cloudinary = require('../server/config/cloudinary');
const streamifier = require('streamifier');
const multer = require('multer');
const fileUpload = multer();
const _ = require('lodash');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVICE_HOST,
  port: process.env.MAIL_SERVICE_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Upload to Cloudinar
function upload(file, folder) {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      {
        folder: `uploads/${folder}`,
        eager: [
          {quality: '60'}
        ]
      },
      (error, result) => {
        if (result) {
          return resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
}

// Calculate rounded time distance
function timeDiff(start) {
  const sec = 1000,
        min = sec*60,
        hr = min*60,
        day = hr*24,
        mn = day*30,
        yr = day*365;
  let dMillis = Date.now() - start,
      dSec = dMillis/sec,
      dMin = dMillis/min,
      dHr = dMillis/hr,
      dDay = dMillis/day,
      dMn = dMillis/mn,
      dYr = dMillis/yr;
  if (dYr > 1) {
    return Math.floor(dYr) + ' year';
  } else if (dMn > 1) {
    return Math.floor(dMn) + ' month';
  } else if (dDay > 1) {
    return Math.floor(dDay) + ' day';
  } else if (dHr > 1) {
    return Math.floor(dHr) + ' hour';
  } else if (dMin > 1) {
    return Math.floor(dMin) + ' minute';
  } else if (dSec > 1) {
    return Math.floor(dSec) + ' second';
  } else {
    return 'Just Now';
  }
}

// * user onboarding
router.get('/welcome', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Profile Setup',
    user: req.user
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/onboarding'), locals);
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

  // res.render(path.resolve(__dirname, '../views/user/onboarding/createprofile'), locals);
  res.render(path.resolve(__dirname, '../views/user/onboarding/onboarding-make'), locals);
});

router.post('/welcome-make', ensureAuthenticated, fileUpload.single('profile'), (req, res) => {
  const { prefName, birthdate, gender, location, profileColor } = req.body;
  const user = req.user;
  const fid = 'f' + nanoid();
  let errors = [];

  User.findOneAndUpdate({uid: user.uid},{fid: fid, node: true},{new: true}).exec((err, user) => {
    if (!user) {
      errors.push({msg: 'We ran into a problem locating your account. Refresh the page or re-register for an account if the problem persists.'});
      res.render(path.resolve(__dirname, '../views/user/onboarding/onboarding-make'), {
        errors: errors,
        title: 'Afiye - Making a Tree',
        user: req.user
      });
    } else {
      let avatarUrl;

    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          {
            folder: `uploads/${req.user.fid}/${req.user.uid}`
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const upload = async (req) => {
      if (!req.file) {
        avatarUrl = 'https://res.cloudinary.com/afiye-io/image/upload/v1614875519/avatars/placeholder_female_akgvlb.png';
      } else {
        let result = await streamUpload(req);
        avatarUrl = result.secure_url;
      }
    };

    upload(req)
      .then(() => {
        const person = {
          uid: user.uid,
          fid: fid,
          firstName: user.firstName,
          prefName: prefName,
          lastName: user.lastName,
          birthdate: birthdate,
          gender: gender,
          location: location,
          profileColor: profileColor,
          avatar: avatarUrl,
          claimed: true,
        };

        api.initFamily(person)
          .then(() => {
            res.redirect('/account/feed');
          });
      });
    }
  });
});

// * user onboarding - join a tree
router.get('/welcome-join', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Joining a Tree',
    user: req.user
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/onboarding-join'), locals);
});

// * user feed
router.get('/feed', ensureAuthenticated, (req, res) => {
  // check if user node has been created
  if (req.user.node === false) {
    res.redirect('/account/welcome');
  } else {
    let postData = [];
    api.getFamily(req.user, req.user.uid)
      .then((result) => {
        console.log(result);
        Post.find({family: req.user.fid}).exec((err, posts) => {
          posts.forEach(item => {
            const ownerData = _.find(result, {'uid': item.owner}),
                  timeStamp = timeDiff(item.date),
                  itemType = 'memory';
            postData.push({ownerData, timeStamp, itemType, item});
          });
        });
        Album.find({family: req.user.fid}).exec((err, albums) => {
          albums.forEach(item => {
            const ownerData = _.find(result, {'uid': item.owner}),
                  timeStamp = timeDiff(item.date),
                  itemType = 'album';
            postData.push({ownerData, timeStamp, itemType, item});
          });
          let sorted = _.sortBy(postData, [(o) => {return o.item.modified; }]).reverse();
          let current = _.find(result, {'uid': req.user.uid});
          console.log(current);
          let locals = {
            title: 'Afiye - Memory Feed',
            user: req.user,
            data: {
              current,
              family: result,
              posts: sorted
            }
          };
          res.render(path.resolve(__dirname, '../views/user/feed/feed'), locals);
        });
    });
  }
});

// user post
router.get('/post-:family-:pid', ensureAuthenticated, (req, res) => {
  let postFamily = req.params.family,
      postId = req.params.pid;

  Post.findOne({ family: postFamily, pid: postId}).exec((err, post) => {
    if (!post) {
      res.redirect('/account/feed');
    } else {
      api.getNode(post.owner)
        .then((result) => {
          let timeStamp = timeDiff(post.date);
          let locals = {
            title: 'Afiye - Post',
            user: req.user,
            data: {
              postOwner: result,
              timeStamp,
              post
            }
          };
          res.render(path.resolve(__dirname, '../views/user/feed/post'), locals);
        });
    }
  });
});

// create post
router.get('/add-post', ensureAuthenticated, (req, res) => {
  api.getFamily(req.user)
    .then((result) => {
      let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));

      let locals = {
        title: 'Afiye - Create Post',
        user: req.user,
        data: {
          family: familyMembers,
        }
      };

      res.render(path.resolve(__dirname, '../views/user/feed/add-post'), locals);
    });
});

router.post('/add-post', ensureAuthenticated, fileUpload.array('post-media-upload'), async (req, res) => {
  const { title, description, tagged_family} = req.body;
  const pid = 'p' + nanoid();

  const files = req.files;

  try {
    let urls = [];
    let multiple = async (path) => await upload(path, `${req.user.fid}/${pid}`);
    for (const file of files) {
      const newPath = await multiple(file);
      urls.push(newPath.secure_url);
    }
    if (urls) {
      let newPost = new Post({
        owner: req.user.uid,
        family: req.user.fid,
        pid,
        title,
        description,
        media: urls,
        tagged: tagged_family
      });
      await newPost.save()
        .then(() => {
          return res.redirect('/account/feed');
        }).catch(error => {
          return res.json(error);
        });
    }
  } catch (e) {
    console.log('err :', e);
    return e;
  }
});

router.get('/album-:family-:alid', ensureAuthenticated, (req, res) => {
  let albumFamily = req.params.family,
      albumId = req.params.alid;

  Album.findOne({ family: albumFamily, alid: albumId }).exec((err, album) => {
    if(!album) {
      res.redirect('/account/feed');
    } else {
      Post.find({
        'pid': { $in: album.posts }
      }).exec((err, posts) => {
        api.getFamily(req.user)
          .then((result) => {
            let postData = [];

            const ownerData = _.find(result, {'uid': album.owner}),
                  timeStamp = timeDiff(album.date),
                  albumData = {ownerData, timeStamp, album};

            posts.forEach(item => {
              const ownerData = _.find(result, {'uid': item.owner}),
                    timeStamp = timeDiff(item.date),
                    itemType = 'memory';
              postData.push({ownerData, timeStamp, itemType, item});
            });

            let locals = {
              title: 'Afiye - Album',
              user: req.user,
              data: {
                family: result,
                albumData,
                postData
              }
            };
            res.render(path.resolve(__dirname, '../views/user/feed/album'), locals);
          });
      });
    }
  });
});

router.get('/add-album', ensureAuthenticated, (req, res) => {
  Post.find({family: req.user.fid, owner: req.user.uid}).exec((err, posts) => {
    api.getFamily(req.user)
      .then((result) => {
        let postData = [];
        posts.forEach(post => {
          const ownerData = _.find(result, {'uid': post.owner});
            let timeStamp = timeDiff(post.date);
            postData.push({ownerData, timeStamp, post});
        });

        let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));

        let locals = {
          title: 'Afiye - Create Album',
          user: req.user,
          data: {
            family: familyMembers,
            postData
          }
        };
        res.render(path.resolve(__dirname, '../views/user/feed/add-album'), locals);
      });
  });
});

router.post('/add-album', ensureAuthenticated, (req, res) => {
  const {title, description, posts, tagged_family} = req.body;
  const alid = 'al' + nanoid();

  Post.findOne({family: req.user.fid, pid: posts[0]}).exec((err, post) => {
    let newAlbum = new Album({
      owner: req.user.uid,
      family: req.user.fid,
      alid,
      title,
      description,
      cover: post.media[0],
      posts,
      tagged: tagged_family,
    });

    newAlbum.save()
      .then(() => {
        return res.redirect('/account/feed');
      }).catch(error => {
        return res.json(error);
      });
  });
});

// modal
// user post
router.get('/modal', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/partials/modal'), locals);
});

// welcome
router.get('/welcome', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/welcome'), locals);
});

// profile-color
router.get('/pcok', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Profile color',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/pcok'), locals);
});

// joining tree
router.get('/joiningtree', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Join Tree',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/joiningtree'), locals);
});

// input code
router.get('/inputcode', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Join Tree',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/inputcode'), locals);
});

router.post('/inputcode', ensureAuthenticated, (req, res) => {
  let {code} = req.body;
  console.log(code);
  Invite.findOne({code: code}).exec((err, invite) => {
    console.log('Invite: ', invite);
    api.getNode(invite.uid)
      .then((result) => {
        console.log('Current: ', req.user);
        console.log('Result: ', result);
        User.findOneAndUpdate({uid: req.user.uid}, {uid: result.uid, fid: result.fid, node: true}, {new: true}).exec((err, user) => {
          let query = `MATCH (p:Person {uid: '${user.uid}'}) SET p.claimed = true RETURN p`;
          api.submitQuery(query);
        });
        res.redirect('/account/feed');
      });
  });
});

// claim profile
router.get('/claimprofile', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Join Tree',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/claimprofile'), locals);
});

// claim profile 2
router.get('/claimprofile-2', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Join Tree',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/claimprofile-2'), locals);
});

// making a tree
router.get('/makingtree', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/makingtree'), locals);
});

// create a profile
router.get('/createprofile', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tagged',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/createprofile'), locals);
});

// create profile-circle
router.get('/pcok-I', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Profile-circle',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/pcok-I'), locals);
});

// join tree done
router.get('/jt-done', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Profile-circle',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/onboarding/jt-done'), locals);
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

      res.render(path.resolve(__dirname, '../views/user/tree/tree'), locals);
    });
});

router.get('/add-member', ensureAuthenticated, (req, res) => {
  api.getFamily(req.user)
    .then((result) => {
      let locals = {
        title: 'Afiye - Add Family Member',
        user: req.user,
        data: {
          family: result,
        }
      };

      res.render(path.resolve(__dirname, '../views/user/member/add-member'), locals);
    });
});


router.post('/add-member', ensureAuthenticated, fileUpload.single('profile'), (req, res) => {
  const { firstName, prefName, lastName, birthdate, gender, relation, related, location, profileColor } = req.body;
  let errors = [];
  let relReciprocal = (relation === 'child')    ? 'parent'
                    : (relation === 'parent')   ? 'child'
                    : (relation === 'sibling')  ? 'sibling'
                    : (relation === 'spouse')   ? 'spouse'
                    : 'Unknown';

  // check if relationship is valid and has a recipricol path
  if (relReciprocal === 'Unknown') {
    errors.push({msg: 'Please select a relationhip to a current family member'});
  }

  if (errors.length > 0) {
    api.getFamily(req.user)
    .then((result) => {
      let locals = {
        title: 'Afiye - Add Family Member',
        user: req.user,
        data: {
          family: result,
        }
      };

      res.render(path.resolve(__dirname, '../views/user/member/add-member'), locals);
    });
  } else {
    const uid = 'u' + nanoid(); // db identifier for user
    let avatarUrl;

    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          {
            folder: `uploads/${req.user.fid}/${uid}`,
            eager: [
              {quality: 'auto'}
            ]
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const upload = async (req) => {
      if (!req.file) {
        avatarUrl = 'https://res.cloudinary.com/afiye-io/image/upload/v1614875519/avatars/placeholder_female_akgvlb.png';
      } else {
        let result = await streamUpload(req);
        avatarUrl = result.secure_url;
      }
    };

    upload(req)
      .then(() => {
        const person = {
          uid: uid,
          fid: req.user.fid,
          firstName: firstName,
          prefName: prefName,
          lastName: lastName,
          birthdate: birthdate,
          gender: gender,
          location: location,
          profileColor: profileColor,
          relation: relation,
          relReciprocal: relReciprocal,
          related: related,
          avatar: avatarUrl,
          claimed: false,
        };

        api.addMember(person)
          .then(results => {
            if (Object.keys(results[0].directRelation).length >= 1) {
              let match = '';
              let merge = '';

              // Find all members of a family
              results[0].members.forEach(member => {
                const m = member.properties.uid;

                match += `MATCH (${m}:Person {uid: '${m}'}) `;
              });

              results[0].directRelation.forEach(relation => {
                const s = relation.s,
                      r = relation.directPath,
                      t = relation.t;

                merge += `MERGE (${s})-[:RELATED {relation: '${r}'}]->(${t}) `;
              });

              const query = match + merge + 'RETURN *';

              api.submitQuery(query);
              res.redirect('/account/tree');
            } else {
              res.redirect('/account/tree');
            }
          });
      });
  }
});

router.get('/invite-member-:uid', ensureAuthenticated, (req, res) => {
  const target = req.params.uid;
  api.getNode(target)
    .then((result) => {
      let locals = {
        title: 'Afiye - Invite Member',
        user: req.user,
        invite: result,
      };

      res.render(path.resolve(__dirname, '../views/user/member/invite-member'), locals);
    });
});

router.post('/invite-member-:uid', ensureAuthenticated, (req, res) => {
  const target = req.params.uid,
        {email, message} = req.body;

  api.getNode(target)
    .then((result) => {
      let code = nanoinv();

      const newInv = new Invite({
        uid: target,
        code
      });

      newInv.save()
        .catch(value => console.log(value));
      let invite = {
        name: result.firstName,
        email,
        message,
        code,
        link: `${process.env.MAIL_DOMAIN}/register`
      };

      ejs.renderFile(__dirname + '/../views/email/invite.ejs', { invite }, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          let mainOptions = {
            from: '"noreply" <noreply@afiye.io>',
            to: email,
            subject: 'Afiye - You\'ve been invited to join a family network',
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

      res.redirect(`/account/profile-${target}`);
    });
});

// * user profile
router.get('/profile-:uid', ensureAuthenticated, (req, res) => {
  let member = req.params.uid;
  api.getFamily(req.user, member)
    .then((result) => {
      let profile = _.find(result, {uid: member}),
          postData = [],
          immRels = ['parent', 'child', 'sibling', 'spouse'],
          immFamily = _.filter(result, rel => _.indexOf(immRels, rel.relType) !== -1); // filter relationships by immRels array

      immFamily = _.uniqBy(immFamily, 'uid'); // clear duplicates

      Post.find({owner: member}).exec((err, posts) => {
        posts.forEach(item => {
          const ownerData = profile,
                timeStamp = timeDiff(item.date),
                itemType = 'memory';
          postData.push({ownerData, timeStamp, itemType, item});
        });

      });
      Album.find({owner: member}).exec((err, albums) => {
        albums.forEach(item => {
          const ownerData = profile,
                timeStamp = timeDiff(item.date),
                itemType = 'album';
          postData.push({ownerData, timeStamp, itemType, item});
        });

        let sorted = _.sortBy(postData, [(o) => {return o.item.modified; }]).reverse(); // sort post data by most recently modified

        let locals = {
          title: `Afiye - ${profile.firstName}'s Profile`,
          user: req.user,
          data: {
            profile,
            family: result.family,
            immFamily,
            posts: sorted,
          }
        };

        res.render(path.resolve(__dirname, '../views/user/profile/profile'), locals);
      });
    });
});

// * user settings
router.get('/settings', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Settings',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings'), locals);
});

// user settings
router.get('/settings-account', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Account Settings',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings-account'), locals);
});

// user settings
router.get('/settings-account-change-password', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Change Password',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings-account-change-password'), locals);
});

// user settings
router.get('/settings-account-leave-tree', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Leave Tree',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings-account-leave-tree'), locals);
});

router.get('/settings-account-deactivate', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Deactivate Account',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings-account-deactivate'), locals);
});

router.get('/settings-privacy', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Privacy Settings',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings-privacy'), locals);
});

router.get('/settings-accessibility', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Accessibility Options',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings-accessibility'), locals);
});


router.get('/settings-email', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Email Notifications',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings-email'), locals);
});

router.get('/tree-tutorial-1', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 1',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/tree/tree-tutorial-1'), locals);
});

router.get('/tree-tutorial-2', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 2',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/tree/tree-tutorial-2'), locals);
});

router.get('/tree-tutorial-3', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 3',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/tree/tree-tutorial-3'), locals);
});

router.get('/tree-tutorial-4', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 4',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/tree/tree-tutorial-4'), locals);
});

router.get('/tree-tutorial-5', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 5',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/tree/tree-tutorial-5'), locals);
});

router.get('/tree-tutorial-6', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Tree Tutorial 6',
    user: req.user,
  };

  res.render(path.resolve(__dirname, '../views/user/tree/tree-tutorial-6'), locals);
});

module.exports = router;