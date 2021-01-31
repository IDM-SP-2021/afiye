import '../scss/styles.scss';

import $ from 'jquery';

const requireAll = (r) => {
  r.keys().forEach(r);
};
requireAll(require.context('../views/', true, /\.ejs$/));

$(() => {
  $('body').append('<p>Test</p>');
});