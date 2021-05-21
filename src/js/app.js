import '../scss/styles.scss';
import '../favicons/favicons';

import $ from 'jquery';
import _ from 'lodash';

const requireAll = (r) => {
  r.keys().forEach(r);
};
requireAll(require.context('../views/', true, /\.ejs$/));
requireAll(require.context('../assets/', true, /\.(png|jpe?g|gif|svg|eps|pdf|zip)$/i));
requireAll(require.context('../fonts/', true, /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/));

$(() => {
  $('input[type="submit"]').attr('disabled', false);

  if ($('main').hasClass('pageType-addPost') || $('main').hasClass('pageType-addAlbum')) {
    familyList(data, 'check'); //eslint-disable-line
  }
  if ($('main').hasClass('pageType-addAlbum')) {
    postSelect(data); //eslint-disable-line
    let requiredCheckboxes = $('#user-posts :checkbox[required]');
    console.log(requiredCheckboxes);
    requiredCheckboxes.on('click', 'post-check', function() {
      console.log('clicked check');
      if (requiredCheckboxes.is(':checked')) {
        requiredCheckboxes.removeAttr('required');
      } else {
        requiredCheckboxes.attr('required', 'required');
      }
    });
  }

  if ($('main').hasClass('pageType-settings')) {
    $('#deactivate-form input[type="submit"]').attr('disabled', true);

    if ($(window).width() < 768) {
      $('#settings-items section').addClass('hidden');
    } else if ($('#settings-menu .item').hasClass('active')) {
      let item = $('#settings-menu .item.active').attr('id').split('-')[1];
      let section = '#section-' + item;

      $(section).siblings().addClass('hidden');
    } else {
      $('#settings-items section:not(:first-child)').addClass('hidden');
      $('#settings-menu .item:first-child').addClass('active');
    }

    $(window).on('resize', () => {
      if ($(window).width() < 768) {
        $('#settings-menu').removeClass('hidden');
        $('#settings-items section').addClass('hidden');
        $('#settings-menu .item').removeClass('active');
      } else if ($(window).width >= 768 && $('#settings-menu .item').hasClass('active')) {
        $('#settings-menu').removeClass('hidden');

        let item = $('#settings-menu .item.active').attr('id').split('-')[1];
        let section = '#section-' + item;

        $(section).siblings().addClass('hidden');
      } else {
        $('#settings-menu').removeClass('hidden');
        $('#settings-items section:not(:first-child)').addClass('hidden');
        $('#settings-items section:first-child').removeClass('hidden');
        $('#settings-menu .item:first-child').addClass('active');
      }
    });

    $('#settings-menu .item').on('click', function() {
      let item = $(this).attr('id').split('-')[1];
      let section = '#section-' + item;

      // change active menu item
      $(this).addClass('active');
      $(this).siblings().removeClass('active');
      // change active setting item section
      $(section).removeClass('hidden');
      $(section).siblings().addClass('hidden');
      // remove any existing error or success messages
      $('.message').remove();

      if ($(window).width() < 768) {
        $('#settings-menu').addClass('hidden');
      }
    });

    $('#settings-items button.back').on('click', function(event) {
      event.preventDefault();
      $(this).parent().addClass('hidden');
      $('#settings-menu').removeClass('hidden');
      $('#settings-menu .item').removeClass('active');
    });

    $('#deactivate-form input[name="currentPassword"], #deactivate-form input[name="confirmLeave"]').on('change', function() {
      if ($('#deactivate-form input[name="currentPassword"]').val() && $('#deactivate-form input[name="confirmLeave"]:checked').length > 0) {
        $('#deactivate-form input[type="submit"]').attr('disabled', false);
      } else {
        $('#deactivate-form input[type="submit"]').attr('disabled', true);
      }
    });
  }
});

// Front nav mobile toggle
$('.nav-toggle').on('click', () => {
  $('.nav-link-group').toggleClass('mobile-nav');
  $('.nav-toggle').toggleClass('is-active');
});

// * Onboarding -------------------------------------------------------------------------
$('input[name=mode]').on('click', () => {
  $('#mode-select input[type=submit]').removeAttr('disabled');
});

// Feed
$('#add-post-control .button').on('click', (event) => {
  event.preventDefault();
  console.log('clicked button');
  $('#add-options').toggleClass('hidden');
});

// modals
$('.modal-inner button.cross').on('click', (event) => {
  event.preventDefault();
  $('.modal-inner button.cross').parent().parent().addClass('hidden');
});

$(document).on('click', function(event) {
  if (!$(event.target).closest('.modal-inner,.open-modal').length) {
    $('body').find('.modal').addClass('hidden');
  }
});

// * node creation form -----------------------------------------------------------------
$('#open-profile').on('click', (event) => { // open profile upload modal
  event.preventDefault();
  $('#profile-upload').removeClass('hidden');
});
$('#open-info').on('click', (event) => {
  event.preventDefault();
  $('#data-info').removeClass('hidden');
});
$('#profile').on('change', () => { // get profile image upload
  readURL($('#profile'), $('#open-profile'));
  $('#profile-upload').addClass('hidden');
});
$('input[name=profileColor]').on('change', () => { // change profile image ring on profile color change
  $('#open-profile').attr('class', `${$('input[name=profileColor]:checked').prop('value')} open-modal`);
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

// Change display name on top of the page on text input change
$('#profile-setup #firstName').on('keyup', () => {
  const first = $('#profile-setup #firstName').prop('value'),
        pref  = $('#profile-setup #prefName').prop('value'),
        last = $('#profile-setup #lastName').prop('value');


  if (pref !== '') {
    $('#profile-setup #full-name span').html(pref + ' ' + last);
  } else {
    $('#profile-setup #full-name span').html(first + ' ' + last);
  }
});
$('#profile-setup #prefName').on('keyup', () => {
  const first = $('#profile-setup #firstName').prop('value'),
        pref  = $('#profile-setup #prefName').prop('value'),
        last = $('#profile-setup #lastName').prop('value');


  if (pref !== '') {
    $('#profile-setup #full-name span').html(pref + ' ' + last);
  } else {
    $('#profile-setup #full-name span').html(first + ' ' + last);
  }
});
$('#profile-setup #lastName').on('keyup', () => {
  const first = $('#profile-setup #firstName').prop('value'),
        pref  = $('#profile-setup #prefName').prop('value'),
        last  = $('#profile-setup #lastName').prop('value');


  if (pref !== '') {
    $('#profile-setup #full-name span').html(pref + ' ' + last);
  } else {
    $('#profile-setup #full-name span').html(first + ' ' + last);
  }
});

$('#profile-setup').on('submit', function() {
  $('#profile-setup input[type="submit"]').attr('disabled', 'disabled');
});
// * ------------------------------------------------------------------------------------

// * Memory creation form ---------------------------------------------------------------
$('#open-tag').on('click', (event) => {
  event.preventDefault();
  $('#tag-family').removeClass('hidden');
});
$('#post-media-upload').on('change', () => {
  readURL($('#post-media-upload'), $('#post-media-preview'));
});
// * ------------------------------------------------------------------------------------

// * Album creation form ----------------------------------------------------------------
const postSelect = (data) => {
  const container = $('#user-posts');
  let tagged = [];

  if (!data.album) {
    console.log('No album data');
  } else if (!data.album.posts) {
    console.log('Album has no posts');
  } else {
    console.log('Album has posts');
    tagged = data.album.posts;
  }

  if (data.postData.length === 0) {
    console.log('User has no posts');
    container.append('<p class="center-header">Please <a href="/account/add-post">create a memory</a> before creating an album</p>');
    $('#add-album input[type="submit"]').attr('disabled', 'disabled');

  } else {
    data.postData.forEach(post => {
      console.log(post);
      let checked = (tagged.includes(post.post.pid)) ? true : false;
      console.log(post.post.pid, checked);
      container.append(`<div id="p-${post.post.pid}" class="post-option"></div>`);
      let item = $(`#p-${post.post.pid}`);
      if (checked) {
        item.append(`<input type="checkbox" name="posts" id="option-${post.post.pid}" class="post-check" value="${post.post.pid}" checked />`);
      } else {
        item.append(`<input type="checkbox" name="posts" id="option-${post.post.pid}" class="post-check" value="${post.post.pid}" />`);
      }
      item.append(`
        <label for="option-${post.post.pid}">
          <img class="post-img" src="${post.post.media[0]}" alt="${post.post.title}" />
          <h4 class="post-title">${post.post.title}</h4>
          <p>Created by "${post.ownerData.firstName}"</p>
        </label>
      `);
    });
  }
};
// * ------------------------------------------------------------------------------------

// * Settings forms ---------------------------------------------------------------------
$('#open-confirmation').on('click', (event) => {
  console.log('Clicked deactivate');
  event.preventDefault();
  $('#deactivate-confirmation').removeClass('hidden');
});
$('#open-data-confirmation').on('click', (event) => {
  console.log('Clicked deactivate');
  event.preventDefault();
  $('#data-confirmation').removeClass('hidden');
});
// * ------------------------------------------------------------------------------------

// Append image preview to page element
const readURL = (input, element) => {
  if (input.prop('files') && input.prop('files')[0]) {
    element.empty();
    for (let i = 0; i < input.prop('files').length; i++) {
      let reader = new FileReader();

      if (input.prop('files')[i].size > 1500000) {
        input.wrap('<form>').closest('form').get(0).reset();
        input.unwrap();
        element.empty();
        element.after('<div class="message error"><i class="icon icon-alert"></i><p>File size is greater than 1.5 MB</p></div>');

        console.log(input.prop('files'));
        break;
      } else {
        $('.message').remove();
        reader.onload = (e) => {
          $($.parseHTML('<img>')).attr('src', e.target.result).appendTo(element);
        };
        reader.readAsDataURL(input.prop('files')[i]);
      }
    }
  }
};

// Generate list of family members
const familyList = (data, option) => {
  // const container = $('#memberList');
  let family = data.family, tagged = [];
  // let tagged = data.post.tagged;
  if (data.post !== undefined) {
    tagged = data.post.tagged;
  }
  if (data.album !== undefined) {
    tagged = data.album.tagged;
  }
  // console.log(tagged);
  let ordered = _.sortBy(family, [member => member.firstName.toLowerCase()]);
  if (family.length == 0) {
    $($.parseHTML(`<p>Hmm... It doesn't look like you have any family in your network yet.</p>`)).appendTo($('#family-list'));
  } else {
    $('#family-list').append('<ul></ul>');
    const container = $('#family-list ul');
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

      $($.parseHTML(`<li id='m-${member.uid}' class='member'></li>`)).appendTo($(container));
      let item = $(`#family-list #m-${member.uid}`);
      if (option === 'check') {
        let checked = (tagged.includes(member.uid)) ? true : false;

        $($.parseHTML(`<div class="family-check"></div>`)).appendTo($(item));
        let container = $(`#family-list #m-${member.uid} .family-check`);
        if (checked) {
          $($.parseHTML(`<input type="checkbox" name="tagged_family" id="option-${member.uid}" value="${member.uid}" checked />`)).appendTo($(container));
        } else {
          $($.parseHTML(`<input type="checkbox" name="tagged_family" id="option-${member.uid}" value="${member.uid}" />`)).appendTo($(container));
        }
        $($.parseHTML(`<label class="user-info" for="option-${member.uid}">
                        <div class="imgname">
                          <div class="avatar ${member.profileColor}">
                            <img src="${member.avatar}" alt="" />
                          </div>
                          <div>
                            <h3>
                              ${name} ${member.lastName}
                            </h3>
                            <span>${member.relation}</span>
                          </div>
                        </div>
                      </label>`)).appendTo($(container));
      } else {
        $($.parseHTML(`<img src='${member.avatar}' alt="${name}'s avatar">`))
          .attr('style', `box-shadow: 0 0 0 2px #fff, 0 0 0 4px ${strokeColor}`)
          .appendTo(`#family-list #m-${member.uid}`);
        $($.parseHTML(`<p>${name} ${member.lastName}</p>`)).appendTo(`#family-list #m-${member.uid}`);
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

$( '.inputfile' ).each( function()
	{
		var $input	 = $( this ),
			$label	 = $input.next( 'label' ),
			labelVal = $label.html();

		$input.on( 'change', function( e )
		{
			var fileName = '';

			if ( this.files && this.files.length > 1 ) {
				fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
      } else if( e.target.value ) {
				fileName = e.target.value.split( '\\' ).pop();
      }

			if ( fileName ) {
				$label.find( 'span' ).html( fileName );
      } else {
				$label.html( labelVal );
      }
		});

		// Firefox bug fix
		$input
		.on( 'focus', function(){ $input.addClass( 'has-focus' ); })
		.on( 'blur', function(){ $input.removeClass( 'has-focus' ); });
	});

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}