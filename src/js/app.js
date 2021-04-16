import '../scss/styles.scss';
import '../favicons/favicons';

import $ from 'jquery';
import _ from 'lodash';

const requireAll = (r) => {
  r.keys().forEach(r);
};
requireAll(require.context('../views/', true, /\.ejs$/));
requireAll(require.context('../assets/', true, /\.(png|jpe?g|gif|svg)$/i));
requireAll(require.context('../fonts/', true, /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/));

$(() => {
  if ($('main').hasClass('pageType-addPost') || $('main').hasClass('pageType-addAlbum')) {
    familyList(data.family, 'check'); //eslint-disable-line
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

// Feed
$('#add-post-control .button').on('click', () => {
  $('#add-options').toggleClass('hidden');
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
  $('#profile-upload').addClass('hidden');
});
$('input[name=profileColor]').on('change', () => { // change profile image ring on profile color change
  $('#open-profile').attr('class', $('input[name=profileColor]:checked').prop('value'));
});
$('#profile-setup input[type="submit"]').on('click', (event) => {
  if (!$('#profile').prop('value') && !$('#profile-setup input[type="submit"]').hasClass('warned') && !$('#open-profile img').length) {
    event.preventDefault();
    console.log('missing profile');
    $('#open-profile').after('<p>Hey you forgot to add a profile picture! If you don\'t have one you can skip this for now!</p>');
    $('html, body').animate({
      scrollTop: 0
    }, 'slow');
    $('#profile-setup input[type="submit"]').addClass('warned');
  }
});
$('#profile-setup #firstName').on('change', () => {
  const first = $('#profile-setup #firstName').prop('value'),
        pref  = $('#profile-setup #prefName').prop('value'),
        last = $('#profile-setup #lastName').prop('value');


  if (pref !== '') {
    $('#profile-setup #full-name span').html(pref + ' ' + last);
  } else {
    $('#profile-setup #full-name span').html(first + ' ' + last);
  }
});
$('#profile-setup #prefName').on('change', () => {
  const first = $('#profile-setup #firstName').prop('value'),
        pref  = $('#profile-setup #prefName').prop('value'),
        last = $('#profile-setup #lastName').prop('value');


  if (pref !== '') {
    $('#profile-setup #full-name span').html(pref + ' ' + last);
  } else {
    $('#profile-setup #full-name span').html(first + ' ' + last);
  }
});
$('#profile-setup #lastName').on('change', () => {
  const first = $('#profile-setup #firstName').prop('value'),
        pref  = $('#profile-setup #prefName').prop('value'),
        last = $('#profile-setup #lastName').prop('value');


  if (pref !== '') {
    $('#profile-setup #full-name span').html(pref + ' ' + last);
  } else {
    $('#profile-setup #full-name span').html(first + ' ' + last);
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
    element.empty();
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
const familyList = (family, option) => {
  // const container = $('#memberList');
  let ordered = _.sortBy(family, [member => member.firstName.toLowerCase()]);
  if (family.length == 0) {
    $($.parseHTML(`<p>Hmm... It doesn't look like you have any family in your network yet.</p>`)).appendTo($('#memberList'));
  } else {
    ordered.forEach(member => {
      let name;

      if (member.prefName) {
        name = member.prefName;
      } else {
        name = member.firstName;
      }
      let color = member.profileColor;
      let strokeColor =
                (color === 'color-pink') ? '#fe66b8'
              : (color === 'color-magenta') ? '#f83a74'
              : (color === 'color-red') ? '#f42525'
              : (color === 'color-orange') ? '#ff5722'
              : (color === 'color-yellow') ? '#ffc52f'
              : (color === 'color-green') ? '#1db954'
              : (color === 'color-teal') ? '#07a092'
              : (color === 'color-light-blue') ? '#0ab4ff'
              : (color === 'color-dark-blue') ? '#4169e1'
              : (color === 'color-purple') ? '#922aff'
              : (color === 'color-brown') ? '#ae640d'
              : (color === 'color-gray') ? '#6e7191'
              : (color === 'color-black') ? '#1d1b2d'
              : color;

      $($.parseHTML(`<div id='m-${member.uid}' class='member'></div>`)).appendTo($('#memberList'));
      if (option === 'check') {
        $($.parseHTML(`<div class="check-container">
                        <input class="checkbox" type="checkbox" name="tagged_family" id="option-${member.uid}" value="${member.uid}" />
                        <label for="option-${member.uid}">${name} ${member.lastName}</label>
                      </div>`)).appendTo(`#memberList #m-${member.uid}`);

      } else {
        $($.parseHTML(`<img src='${member.avatar}' alt="${name}'s avatar">`))
          .attr('style', `box-shadow: 0 0 0 2px #fff, 0 0 0 4px ${strokeColor}`)
          .appendTo(`#memberList #m-${member.uid}`);
        $($.parseHTML(`<p>${name} ${member.lastName}</p>`)).appendTo(`#memberList #m-${member.uid}`);
      }
    });
  }
};

$('.tab-bar a').on('click', (event) => {
  event.preventDefault();
  console.log('Tab bar item clicked');
  console.log(event.target);
  if (!$(event.target).hasClass('active')) {
    $('.tab-bar a.active').removeClass('active');
    $(event.target).addClass('active');
    console.log($(event.target).attr('href'));
    $('.tab-container').addClass('hidden');
    console.log($($(event.target).attr('href')));
    $($(event.target).attr('href')).removeClass('hidden');
  }
});

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}