import '../scss/styles.scss';

import $ from 'jquery';
import _ from 'lodash';

const requireAll = (r) => {
  r.keys().forEach(r);
};
requireAll(require.context('../views/', true, /\.ejs$/));
requireAll(require.context('../assets/', true, /\.(png|jpe?g|gif|svg)$/i));
requireAll(require.context('../fonts/', true, /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/));

$(() => {
  if ($('main').hasClass('pageType-addPost')) {
    familyList(data.family); //eslint-disable-line
  }
});

// Front nav mobile toggle
$('.nav-toggle').on('click', () => {
  $('.nav-link-group').toggleClass('mobile-nav');
  $('.nav-toggle').toggleClass('is-active');
});

// Onboarding
$('input[name=mode]').on('click', () => {
  $('#mode-select input[type=submit]').removeAttr('disabled');
});


// modals
$('.modal-inner button.cross').on('click', (event) => {
  event.preventDefault();
  $('.modal-inner button.cross').parent().parent().addClass('hidden');
});

// node creation form
$('#open-profile').on('click', (event) => { // open profile upload modal
  event.preventDefault();
  $('#profile-upload').removeClass('hidden');
});
$('#profile').on('change', () => { // get profile image upload
  readURL($('#profile'), $('#open-profile'));
});
$('input[name=profileColor]').on('change', () => { // change profile image ring on profile color change
  let color = $('input[name=profileColor]:checked').prop('value');
  $('#open-profile').css('box-shadow', `0 0 0 5px #fff, 0 0 0 10px #${color}`);
});
$('#profile-setup input[type="submit"]').on('click', (event) => {
  if (!$('#profile').prop('value') && !$('#profile-setup input[type="submit"]').hasClass('warned')) {
    event.preventDefault();
    console.log('missing profile');
    $('#open-profile').after('<p>Hey you forgot to add a profile picture! If you don\'t have one you can skip this for now!</p>');
    $('#profile-setup input[type="submit"]').addClass('warned');
  }
});

// Memory creation form
$('#open-tag').on('click', (event) => {
  event.preventDefault();
  $('#tag-family').removeClass('hidden');
});
$('#post-media-upload').on('change', () => {
  readURL($('#post-media-upload'), $('#post-media-preview'));
});

// Append image preview to page element
const readURL = (input, element) => {
  if (input.prop('files') && input.prop('files')[0]) {
    for (let i = 0; i < input.prop('files').length; i++) {
      let reader = new FileReader();

      reader.onload = (e) => {
        $($.parseHTML('<img>')).attr('src', e.target.result).appendTo(element);
      };

      reader.readAsDataURL(input.prop('files')[i]);
    }

  }
};

// Generate list of family members
const familyList = (family) => {
  console.log(family);
  // const container = $('#memberList');
  let ordered = _.sortBy(family, 'firstName');
  console.log(ordered);
  family.forEach(member => {
   console.log(member);
  });
};

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}