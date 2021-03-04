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

  // node creation form
  $('#open-profile').on('click', (event) => {
    event.preventDefault();
    $('#profile-upload').removeClass('hidden');
  });
  $('#profile').on('change', () => {
    readURL($('#profile'), $('#open-profile img'));
  });
  $('input[name=profileColor]').on('change', () => {
    let color = $('input[name=profileColor]:checked').prop('value');
    $('#open-profile').css('box-shadow', `0 0 0 5px #fff, 0 0 0 10px #${color}`);
  });

  // modals
  $('.modal-inner button.cross').on('click', (event) => {
    event.preventDefault();
    $('.modal-inner button.cross').parent().parent().addClass('hidden');
  });
});

const readURL = (input, element) => {
  console.log(input.prop('files')[0]);
  if (input.prop('files') && input.prop('files')[0]) {
    let reader = new FileReader();

    reader.onload = (e) => {
      console.log(e.target.result);
      element.attr('src', e.target.result);
    };

    reader.readAsDataURL(input.prop('files')[0]);
  }
};

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}