const path = require('path');
const express = require('express');
const router = express.Router();
const {ensureAuthenticated} = require('../server/config/auth.js');
const User = require('../models/user.js');
const Post = require('../models/post.js');
const Album = require('../models/album.js');
const {Invite} = require('../models/invite.js');
const {Email} = require('../models/email.js');
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
const bcrypt = require('bcrypt');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVICE_HOST,
  port: process.env.MAIL_SERVICE_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Upload to Cloudinary
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
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Profile Setup',
      user: req.user
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/onboarding'), locals);
  }
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
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Making a Tree',
      user: req.user
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/onboarding-make'), locals);
  }
});

router.post('/welcome-make', ensureAuthenticated, fileUpload.single('profile'), (req, res) => {
  const { prefName, birthdate, gender, location, profileColor, fakeData } = req.body;
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

        api.initFamily(person, fakeData)
          .then(() => {
            if (fakeData === 'on') {
              const fkPosts = [
                {
                  owner: 'uMvpyb1d1FZ',
                  family: fid,
                  pid: 'p9Aj8a2KpNG',
                  title: 'Island Vacation 2019',
                  description: 'Trip to tropical island with my family. We had lots of fun at the beach and being away hustle and bustle of home.',
                  media: ['https://res.cloudinary.com/afiye-io/image/upload/v1620272415/fakeData/posts/p9Aj8a2KpNG/jimmy-conover-3CTuFxZBra0-unsplash_hcvbeo.jpg','https://res.cloudinary.com/afiye-io/image/upload/v1620272409/fakeData/posts/p9Aj8a2KpNG/s-migaj-b2qszO9C7sw-unsplash_azvo1g.jpg','https://res.cloudinary.com/afiye-io/image/upload/v1620272395/fakeData/posts/p9Aj8a2KpNG/tron-le-JsuBKjHGDMM-unsplash_eufcvo.jpg'],
                  tagged: [req.user.uid, 'uvRM0o3GMMk'],
                  type: 'fakeData'
                },
                {
                  owner: 'ukvFelkp5Lb',
                  family: fid,
                  pid: 'pSmW6PkiXyl',
                  title: 'Happy Gotcha Day!',
                  description: 'Everyone meet my new pup, Riley!',
                  media: ['https://res.cloudinary.com/afiye-io/image/upload/v1620273328/fakeData/posts/pSmW6PkiXyl/parttime-portraits-atOlntWcO4k-unsplash_v7qozz.jpg'],
                  tagged: [],
                  type: 'fakeData'
                },
                {
                  owner: 'ukvFelkp5Lb',
                  family: fid,
                  pid: 'py6YMNbCh1i',
                  title: 'Grand Canyon Trip',
                  description: 'Amazing trip off the bucket list with my brother. We all can\'t wait to go back and explore what we couldn\'t get to this year!',
                  media: ['https://res.cloudinary.com/afiye-io/image/upload/v1620275170/fakeData/posts/py6YMNbCh1i/Sitting_Dangerous_fjcizf.jpg','https://res.cloudinary.com/afiye-io/image/upload/v1620275170/fakeData/posts/py6YMNbCh1i/Sarah_enjoying_the_view_qazejm.jpg','https://res.cloudinary.com/afiye-io/image/upload/v1620275170/fakeData/posts/py6YMNbCh1i/Dead_tree_at_the_canyon_ngsgqh.jpg'],
                  tagged: ['uvRM0o3GMMk','uMvpyb1d1FZ'],
                  type: 'fakeData'
                },
                {
                  owner: 'uphXLVN5uAJ',
                  family: fid,
                  pid: 'psbn0D15CEX',
                  title: 'Catching up with the grandkids',
                  description: 'Had a wonderful lunch with my grandkids near their college',
                  media: ['https://res.cloudinary.com/afiye-io/image/upload/v1620274135/fakeData/posts/psbn0D15CEX/mason-dahl--7AxXbZekDE-unsplash_fwviwo.jpg','https://res.cloudinary.com/afiye-io/image/upload/v1620274130/fakeData/posts/psbn0D15CEX/krisztina-papp-ND5zJAxKRqo-unsplash_wkwr6f.jpg'],
                  tagged: [req.user.uid,'uRQKKly4WV7'],
                  type: 'fakeData'
                },
                {
                  owner: 'uvRM0o3GMMk',
                  family: fid,
                  pid: 'p8wBZqMukLy',
                  title: 'Mark\'s High-School Graduation',
                  description: 'Hard to believe he is finally graduating. We are such proud parents to see him walk across the stage. Time for college and another adventure!',
                  media: ['https://res.cloudinary.com/afiye-io/image/upload/v1620276258/fakeData/posts/p8wBZqMukLy/good-free-photos-YZsvNs2GCPU-unsplash_zdonny.jpg','https://res.cloudinary.com/afiye-io/image/upload/v1620276252/fakeData/posts/p8wBZqMukLy/ali-abdelbari-hFLVc7d73j8-unsplash_odc0z1.jpg','https://res.cloudinary.com/afiye-io/image/upload/v1620276245/fakeData/posts/p8wBZqMukLy/wout-vanacker-l4HBYkURqvE-unsplash_rcjh6q.jpg'],
                  tagged: ['uMvpyb1d1FZ','uRQKKly4WV7'],
                  type: 'fakeData'
                },
              ];
              Post.collection.insertMany(fkPosts, function(err, docs) {
                if (err) {
                  return console.log(err);
                } else {
                  console.log('Inserted multiple posts');
                  res.redirect('/account/feed');
                }
              });
            } else {
              res.redirect('/account/feed');
            }
          });
      });
    }
  });
});

// * user onboarding - join a tree
router.get('/welcome-join', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Joining a Tree',
      user: req.user
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/onboarding-join'), locals);
  }
});

// * user feed
router.get('/feed', ensureAuthenticated, (req, res) => {
  // check if user node has been created
  if (req.user.node === false) {
    res.redirect('/account/welcome');
  } else {
    let postData = [];
    api.getFamily(req.user.uid, req.user.fid)
      .then((result) => {
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
      console.log('Post data: ', post);
      api.getFamily(req.user.uid, req.user.fid)
        .then((result) => {
          let owner = _.find(result, {uid: post.owner}),
              tagged = [],
              timeStamp = timeDiff(post.date),
              editable = false;

          post.tagged.forEach(person => {
            let member = _.find(result, {uid: person});
            member.relation =
                (member.relation === 'greatgrandchild') ? 'Great Grandchild'
              : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
              : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
              : (member.relation === 'childinlaw') ? 'Child-in-Law'
              : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
              : (member.relation === 'greatnibling') ? 'Great Nibling'
              : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
            tagged.push(member);
          });

          if (post.owner === req.user.uid || post.tagged.includes(req.user.uid)) {
            editable = true;
          }
          let locals = {
            title: 'Afiye - Post',
            user: req.user,
            data: {
              postOwner: owner,
              tagged,
              timeStamp,
              post,
              editable
            }
          };
          res.render(path.resolve(__dirname, '../views/user/feed/post'), locals);
        });
    }
  });
});

router.get('/edit-post-:pid', ensureAuthenticated, (req, res) => {
  let post = req.params.pid;

  Post.findOne({pid: post}).exec((err, post) => {
    if (!post) {
      console.log('Cannot find post to edit');
      res.redirect('/account/feed');
    } else if (post.owner !== req.user.uid && !post.tagged.includes(req.user.uid)) {
      console.log('Cannot edit this post');
      console.log(post.owner, post.tagged, req.user.uid);
      res.redirect(`/account/post-${req.user.fid}-${post.pid}`);
    } else {
      api.getFamily(req.user.uid, req.user.fid)
        .then((result) => {
          let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));
          familyMembers.forEach(member => {
            member.relation =
                (member.relation === 'greatgrandchild') ? 'Great Grandchild'
              : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
              : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
              : (member.relation === 'childinlaw') ? 'Child-in-Law'
              : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
              : (member.relation === 'greatnibling') ? 'Great Nibling'
              : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
          });
          let locals = {
            title: 'Afiye - Edit Post',
            user: req.user,
            data: {
              family: familyMembers,
              post,
            }
          };
          res.render(path.resolve(__dirname, '../views/user/feed/edit-post'), locals);
        });
    }
  });
});

router.post('/edit-post-:pid', ensureAuthenticated, fileUpload.array('post-media-upload'), async (req, res) => {
  const post = req.params.pid,
        { title, description, current_media, tagged_family} = req.body,
        files = req.files;
  let errors = [],
      media_arr;
  if (typeof(current_media) === 'string') {
    media_arr = current_media.split();
  } else {
    media_arr = current_media;
  }

  console.log('Files: ', files);

  Post.findOne({pid: post}).exec(async (err, post) => {
    const media = post.media;
    let newMedia = media,
        urls = [];
    if (media_arr) {
      media_arr.forEach(img => {
        urls.push(media[img]);
      });
    }
    urls.forEach(url => {
      newMedia = _.remove(newMedia, url);
    });
    if (files.length > 0) {
      try {
        let multiple = async (path) => await upload(path, `${post.owner}/${post.pid}`);
        for (const file of files) {
          const newPath = await multiple(file);
          newMedia.push(newPath.secure_url);
        }
      } catch (e) {
        console.log('err :', e);
        return e;
      }
    }
    console.log(newMedia);
    if (!newMedia.length > 0) {
      console.log('No media');
      errors.push({msg: 'Memories must contain at least one image'});

      api.getFamily(req.user.uid, req.user.fid)
        .then((result) => {
          console.log('After getFamily: ', post);
          let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));
          familyMembers.forEach(member => {
            member.relation =
                (member.relation === 'greatgrandchild') ? 'Great Grandchild'
              : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
              : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
              : (member.relation === 'childinlaw') ? 'Child-in-Law'
              : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
              : (member.relation === 'greatnibling') ? 'Great Nibling'
              : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
          });
          let locals = {
            title: 'Afiye - Edit Post',
            user: req.user,
            data: {
              family: familyMembers,
              post,
              errors
            }
          };

          console.log(locals.data);
          res.render(path.resolve(__dirname, '../views/user/feed/edit-post'), locals);
        });
    } else {
      post.title = title;
      post.description = description;
      post.media = newMedia;
      post.tagged = tagged_family;

      await post.save()
      .then(() => {
        res.redirect(`/account/post-${req.user.fid}-${post.pid}`);
      }).catch(error => {
        return res.json(error);
      });
    }
  });
});

// create post
router.get('/add-post', ensureAuthenticated, (req, res) => {
  api.getFamily(req.user.uid, req.user.fid)
    .then((result) => {
      let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));
      familyMembers.forEach(member => {
        member.relation =
            (member.relation === 'greatgrandchild') ? 'Great Grandchild'
          : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
          : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
          : (member.relation === 'childinlaw') ? 'Child-in-Law'
          : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
          : (member.relation === 'greatnibling') ? 'Great Nibling'
          : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
      });
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

  console.log('Tagged :', tagged_family);
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
        api.getFamily(req.user.uid, req.user.fid)
          .then((result) => {
            let postData = [],
                tagged = [],
                editable = false;

            console.log('Album: ', album);

            album.tagged.forEach(person => {
              let member = _.find(result, {uid: person});
              member.relation =
                  (member.relation === 'greatgrandchild') ? 'Great Grandchild'
                : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
                : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
                : (member.relation === 'childinlaw') ? 'Child-in-Law'
                : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
                : (member.relation === 'greatnibling') ? 'Great Nibling'
                : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
              tagged.push(member);
            });

            const ownerData = _.find(result, {'uid': album.owner}),
                  timeStamp = timeDiff(album.date),
                  albumData = {ownerData, timeStamp, album};

            posts.forEach(item => {
              const ownerData = _.find(result, {'uid': item.owner}),
                    timeStamp = timeDiff(item.date),
                    itemType = 'memory';
              postData.push({ownerData, timeStamp, itemType, item});
            });

            if (album.owner === req.user.uid || album.tagged.includes(req.user.uid)) {
              editable = true;
            }

            let locals = {
              title: 'Afiye - Album',
              user: req.user,
              data: {
                family: result,
                albumData,
                tagged,
                postData,
                editable
              }
            };
            console.log('Album data: ', locals.data.albumData);
            res.render(path.resolve(__dirname, '../views/user/feed/album'), locals);
          });
      });
    }
  });
});

router.get('/add-album', ensureAuthenticated, (req, res) => {
  Post.find({family: req.user.fid, owner: req.user.uid}).exec((err, posts) => {
    api.getFamily(req.user.uid, req.user.fid)
      .then((result) => {
        let postData = [];
        posts.forEach(post => {
          const ownerData = _.find(result, {'uid': post.owner});
            let timeStamp = timeDiff(post.date);
            postData.push({ownerData, timeStamp, post});
        });

        let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));
        familyMembers.forEach(member => {
          member.relation =
              (member.relation === 'greatgrandchild') ? 'Great Grandchild'
            : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
            : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
            : (member.relation === 'childinlaw') ? 'Child-in-Law'
            : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
            : (member.relation === 'greatnibling') ? 'Great Nibling'
            : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
        });

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
  const {title, description, posts, tagged_family} = req.body,
        alid = 'al' + nanoid();
  let post_arr;

  console.log('Adding album: ', req.body);
  console.log('Posts type ', typeof(posts));
  if (typeof(posts) === 'string') {
    post_arr = posts.split();
  } else {
    post_arr = posts;
  }

  Post.findOne({family: req.user.fid, pid: post_arr[0]}).exec((err, post) => {
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

// edit album
router.get('/edit-album-:alid', ensureAuthenticated, (req, res) => {
  const album = req.params.alid;

  Album.findOne({alid: album}).exec((err, album) => {
    if (!album) {
      console.log('Cannot find post to edit');
      res.redirect('/account/feed');
    } else {
      Post.find({family: req.user.fid, owner: req.user.uid}).exec((err, posts) => {
        api.getFamily(req.user.uid, req.user.fid)
          .then((result) => {
            let postData = [];
            posts.forEach(post => {
              const ownerData = _.find(result, {'uid': post.owner});
                let timeStamp = timeDiff(post.date);
                postData.push({ownerData, timeStamp, post});
            });

            let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));
            familyMembers.forEach(member => {
              member.relation =
                  (member.relation === 'greatgrandchild') ? 'Great Grandchild'
                : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
                : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
                : (member.relation === 'childinlaw') ? 'Child-in-Law'
                : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
                : (member.relation === 'greatnibling') ? 'Great Nibling'
                : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
            });

            let locals = {
              title: 'Afiye - Create Album',
              user: req.user,
              data: {
                family: familyMembers,
                postData,
                album
              }
            };
            res.render(path.resolve(__dirname, '../views/user/feed/edit-album'), locals);
          });
      });
    }
  });
});

router.post('/edit-album-:alid', ensureAuthenticated, (req, res) => {
  const {title, description, posts, tagged_family} = req.body,
        album = req.params.alid;
  let post_arr = (typeof(posts) === 'string') ? posts.split()
               : (posts === undefined) ? []
               : posts,
      errors = [];

  console.log('Post array: ', post_arr);
  console.log('Edited album: ', req.body);
  Album.findOne({alid: album}).exec(async (err, album) => {
    if (!album) {
      console.log('Cannot find post to edit');
      res.redirect('/account/feed');
    } else {
      if (!(post_arr.length > 0)) {
        console.log('No posts!');
        errors.push({msg: 'Albums must contain at least one memory'});

        Post.find({family: req.user.fid, owner: req.user.uid}).exec((err, posts) => {
          api.getFamily(req.user.uid, req.user.fid)
            .then((result) => {
              let postData = [];
              posts.forEach(post => {
                const ownerData = _.find(result, {'uid': post.owner});
                  let timeStamp = timeDiff(post.date);
                  postData.push({ownerData, timeStamp, post});
              });

              let familyMembers = _.pull(result, _.find(result, {'uid': req.user.uid}));
              familyMembers.forEach(member => {
                member.relation =
                    (member.relation === 'greatgrandchild') ? 'Great Grandchild'
                  : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
                  : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
                  : (member.relation === 'childinlaw') ? 'Child-in-Law'
                  : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
                  : (member.relation === 'greatnibling') ? 'Great Nibling'
                  : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
              });

              let locals = {
                title: 'Afiye - Create Album',
                user: req.user,
                data: {
                  family: familyMembers,
                  postData,
                  album,
                  errors
                }
              };
              res.render(path.resolve(__dirname, '../views/user/feed/edit-album'), locals);
            });
        });
      } else {
        album.title = title;
        album.description = description;
        album.posts = post_arr;
        album.tagged = tagged_family;

        await album.save()
        .then(() => {
          res.redirect(`/account/album-${req.user.fid}-${album.alid}`);
        }).catch(error => {
          return res.json(error);
        });
      }
    }
  });
});

// joining tree
router.get('/joiningtree', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Join Tree',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/joiningtree'), locals);
  }
});

// input code
router.get('/inputcode', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Join Tree',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/inputcode'), locals);
  }
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
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Join Tree',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/claimprofile'), locals);
  }
});

// claim profile 2
router.get('/claimprofile-2', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Join Tree',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/claimprofile-2'), locals);
  }
});

// making a tree
router.get('/makingtree', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Tagged',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/makingtree'), locals);
  }
});

// create a profile
router.get('/createprofile', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Tagged',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/createprofile'), locals);
  }
});

// create profile-circle
router.get('/pcok-I', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Profile-circle',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/pcok-I'), locals);
  }
});

// join tree done
router.get('/jt-done', ensureAuthenticated, (req, res) => {
  if (req.user.node === true) {
    console.log('User already has an active node');
    res.redirect('/account/feed');
  } else {
    let locals = {
      title: 'Afiye - Profile-circle',
      user: req.user,
    };

    res.render(path.resolve(__dirname, '../views/user/onboarding/jt-done'), locals);
  }
});

// user tree
router.get('/tree', ensureAuthenticated, (req, res) => {
  api.getData(req.user)
    .then((result) => {
      console.log(result);
      result.family.forEach(member => {
        member.relation =
            (member.relation === 'greatgrandchild') ? 'Great Grandchild'
          : (member.relation === 'greatgrandparent') ? 'Great Grandparent'
          : (member.relation === 'siblinginlaw') ? 'Sibling-in-Law'
          : (member.relation === 'childinlaw') ? 'Child-in-Law'
          : (member.relation === 'parentinlaw') ? 'Parent-in-Law'
          : (member.relation === 'greatnibling') ? 'Great Nibling'
          : member.relation.charAt(0).toUpperCase() + member.relation.slice(1);
      });
      let locals = {
        title: 'Afiye - Family Tree',
        user: req.user,
        data: {
          user: {
            name: req.user.name
          },
          graph: result.graph,
          family: result.family
        }
      };

      res.render(path.resolve(__dirname, '../views/user/tree/tree'), locals);
    });
});

router.get('/add-member', ensureAuthenticated, (req, res) => {
  api.getFamily(req.user.uid, req.user.fid)
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
    api.getFamily(req.user.uid, req.user.fid)
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

              api.submitQuery(query)
                .then(() => {
                  res.redirect('/account/tree');
                });
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
  api.getFamily(member, req.user.fid)
    .then((result) => {
      let profile = _.find(result, {uid: member}),
          postData = [],
          immRels = ['parent', 'child', 'sibling', 'spouse'],
          immFamily = _.filter(result, rel => _.indexOf(immRels, rel.relation) !== -1); // filter relationships by immRels array

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

router.get('/edit-profile-:uid', (req, res) => {
  let member = req.params.uid;
  api.getFamily(req.user.uid, req.user.fid)
    .then((result) => {
      let profile = _.find(result, {uid: member});
      if (profile.claimed === true && profile.uid !== req.user.uid) {
        console.log('Cannot edit this profile');
        res.redirect(`/account/profile-${profile.uid}`);
      } else {
        console.log('Able to edit this profile');
        let locals = {
          title: 'Afiye - Edit Profile',
          user: req.user,
          data: {
            profile,
            family: result.family,
          }
        };
        console.log('Edit profile: ', profile);
        res.render(path.resolve(__dirname, '../views/user/profile/edit'), locals);
      }
    });
});

router.post('/edit-profile-:uid', fileUpload.single('profile'), (req, res) => {
  let member = req.params.uid;
  const { firstName, prefName, lastName, birthdate, gender, location, profileColor } = req.body;
  const memData = {
    uid: member,
    fid: req.user.fid,
    firstName,
    prefName,
    lastName,
    birthdate,
    gender,
    location,
    profileColor
  };
  if (req.file) {
    let avatarUrl;

    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          {
            folder: `uploads/${req.user.fid}/${member}`,
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
        memData.avatar = avatarUrl;
        let query = `MATCH (p:Person {fid: '${memData.fid}', uid: '${memData.uid}'}) SET `;

        _.forEach(memData, (value, key) => {
          if (key !== 'uid' && key !== 'fid') {
            query += `p.${key} = '${value}',`;
          }
        });

        query = query.slice(0,-1);
        query += ' RETURN p';

        api.submitQuery(query)
          .then(() => {
            res.redirect(`/account/profile-${member}`);
          });
      });
  } else {
    let query = `MATCH (p:Person {fid: '${memData.fid}', uid: '${memData.uid}'}) SET `;

    _.forEach(memData, (value, key) => {
      if (key !== 'uid' && key !== 'fid') {
        query += `p.${key} = '${value}',`;
      }
    });

    query = query.slice(0,-1);
    query += ' RETURN p';

    api.submitQuery(query)
      .then(() => {
        res.redirect(`/account/profile-${member}`);
      });
  }
});

// * user settings
router.get('/settings', ensureAuthenticated, (req, res) => {
  let locals = {
    title: 'Afiye - Settings',
    user: req.user,
    section: '',
  };

  res.render(path.resolve(__dirname, '../views/user/settings/settings'), locals);
});

router.post('/settings-account-change-email', ensureAuthenticated, (req, res) => {
  const { newEmail } = req.body;
  let errors = [];

  if (newEmail === req.user.email) {
    errors.push({msg: 'Can\'t use your current email'});
  }

  console.log('Error length: ', errors.length);

  if (errors.length > 0) {
    res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
      errors: errors,
      newEmail: newEmail,
      title: 'Afiye - Settings',
      user: req.user,
      section: 'email',
    });
  } else {
    User.findOne({email: newEmail}).exec((err, user) => {
      if (user) {
        errors.push({msg: 'That email is already in use'});
        res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
          errors: errors,
          newEmail: newEmail,
          title: 'Afiye - Settings',
          user: req.user,
          section: 'email',
        });
      } else {
        const emToken = nanoid();
        const emCode = nanoinv();

        const newEm = new Email({
          uid: req.user.uid,
          token: emToken,
          email: newEmail,
          code: emCode
        });

        newEm.save()
          .catch(value => console.log(value));

        console.log(req.user);

        let message = {
          name: req.user.firstName,
          code: emCode,
          link: `${process.env.MAIL_DOMAIN}/update-email/${req.user.uid}-${emToken}`
        };

        ejs.renderFile(__dirname + '/../views/email/updateEmail.ejs', { message }, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            let mainOptions = {
              from: '"noreply" <noreply@afiye.io>',
              to: newEmail,
              subject: 'Afiye - We\'ve Received a Request to Update Your Email Address',
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

        res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
          success_msg: 'Please check your email to verify your change',
          newEmail: newEmail,
          title: 'Afiye - Settings',
          user: req.user,
          section: 'email',
        });
      }
    });
  }
});

router.post('/settings-account-change-password', ensureAuthenticated, (req, res) => {
  const { currentPassword, newPassword, newPassword2 } = req.body;
  let errors = [];

  // check if passwords match
  if (newPassword !== newPassword2) {
    errors.push({msg: 'Passwords don\'t match'});
  }

  // check if password is more than 6 characters
  if (newPassword.length < 6) {
    errors.push({msg: 'Password must be at least 6 characters'});
  }

  if (errors.length > 0) {
    res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
      errors: errors,
      newPassword: newPassword,
      newPassword2: newPassword2,
      title: 'Afiye - Settings',
      user: req.user,
      section: 'password'
    });
  } else {
    User.findOne({uid: req.user.uid}).exec((err, user) => {
      bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
        if (!isMatch) {
          errors.push({msg: 'Current password is incorrect'});
          res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
            errors: errors,
            newPassword: newPassword,
            newPassword2: newPassword2,
            title: 'Afiye - Settings',
            user: req.user,
            section: 'password'
          });
        } else {
          bcrypt.genSalt(10,(err,salt) =>
          bcrypt.hash(newPassword,salt, (err,hash)=> {
            if(err) {
              throw err;
            } else {
              User.findOneAndUpdate({uid: req.user.uid}, {password: hash}, {new: true}).exec((err, user) => {
                if (!user) {
                  errors.push({msg: 'locate'});
                  res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
                    errors: errors,
                    newPassword: newPassword,
                    newPassword2: newPassword2,
                    title: 'Afiye - Settings',
                    user: req.user,
                    section: 'password'
                  });
                } else {
                  res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
                    success_msg: 'Your password has been updated!',
                    newPassword: newPassword,
                    newPassword2: newPassword2,
                    title: 'Afiye - Settings',
                    user: req.user,
                    section: 'password'
                  });
                }
              });
            }
          }
          ));
        }
      });
    });
  }
});

router.post('/settings-account-deactivate-account', ensureAuthenticated, (req, res) => {
  const { currentPassword, confirmLeave } = req.body;
  let errors = [];

  console.log(req.user);

  if (confirmLeave !== 'on') {
    errors.push({msg: 'You must agree to the statement'});
  }

  if (errors.length > 0) {
    res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
      errors: errors,
      title: 'Afiye - Settings',
      user: req.user,
      section: 'deactivate',
    });
  } else {
    User.findOne({uid: req.user.uid}).exec((err, user) => {
      bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
        if (!isMatch) {
          errors.push({msg: 'Password is incorrect'});
          res.render(path.resolve(__dirname, '../views/user/settings/settings'), {
            errors: errors,
            title: 'Afiye - Settings',
            user: req.user,
            section: 'deactivate',
          });
        } else {
          let message = {
            name: req.user.firstName
          };

          ejs.renderFile(__dirname + '/../views/email/deactivate.ejs', { message }, (err, data) => {
            if (err) {
              console.log(err);
            } else {
              let mainOptions = {
                from: '"noreply" <noreply@afiye.io>',
                to: req.user.email,
                subject: 'Afiye - Sorry to See You Go',
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

          User.findOneAndDelete({uid: req.user.uid}).exec((err, user) => {
            let query = `MATCH (p:Person {uid: '${user.uid}'}) SET p.claimed = false RETURN p`;
            api.submitQuery(query);
          });
          res.redirect('/logout');
        }
      });
    });
  }
});

module.exports = router;