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

  $('.nav-toggle').on('click', () => {
    $('.nav-link-group').toggleClass('mobile-nav');
    $('.nav-toggle').toggleClass('is-active');
  });
});

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}