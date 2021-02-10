import '../scss/styles.scss';

import $ from 'jquery';

const requireAll = (r) => {
  r.keys().forEach(r);
};
requireAll(require.context('../views/', true, /\.ejs$/));
requireAll(require.context('../assets/', true, /\.(png|jpe?g|gif|svg)$/i));
requireAll(require.context('../fonts/', true, /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/));

$(() => {
  console.log('Hello from app');

  const navToggler = $('#nav-toggler');
  navToggler.prop('checked', false);
  const headerNav= $('.header-nav');

  console.log(navToggler);
  console.log(headerNav);

  if (navToggler.length > 0) {
    console.log('nav toggle exits');
    headerNav.css('transform', 'translate(100%, 0)');
  }

  navToggler.on('change', () => {
    if ($('#nav-toggler').prop('checked') === false) {
      $('.header-nav').css('transform', 'translate(100%, 0)');
    } else {
      $('.header-nav').css('transform', 'none');
    }
  });
});

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}