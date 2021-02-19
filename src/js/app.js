import '../scss/styles.scss';

import $ from 'jquery';

const requireAll = (r) => {
  r.keys().forEach(r);
};
requireAll(require.context('../views/', true, /\.ejs$/));
requireAll(require.context('../assets/', true, /\.(png|jpe?g|gif|svg)$/i));
requireAll(require.context('../fonts/', true, /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/));

$(() => {
  // Front nav mobile toggle
  $('.nav-toggle').on('click', () => {
    $('.nav-link-group').toggleClass('mobile-nav');
    $('.nav-toggle').toggleClass('is-active');
  });

  // Onboarding
  $('input[name=mode]').on('click', () => {
    $('#mode-select input[type=submit]').removeAttr('disabled');
  });

  $('#profile-setup #birthdate, #profile-setup #gender, #profile-setup input[name=profileColor]').on('click keyup', () => {
    if (allFilled()) {
      $('#profile-setup input[type=submit]').removeAttr('disabled');
    } else {
      $('#profile-setup input[type=submit]').prop('disabled', true);
    }
  });
});

// Check if all specified fields are filled
const allFilled = () => {
  let filled = true;
  $('body input').each(() => {
    if ($(this).val() == '') {
      filled = false;
    }
  });
  return filled;
};

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}