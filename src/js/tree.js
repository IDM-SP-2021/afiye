import $ from 'jquery';

$(function() {
  console.log('From tree.js');
  console.log(data);
  // fetchTest();
});

// const fetchTest = () => {
//   $.ajax({
//     url: 'http://localhost:3000/account/tree',
//     method: 'GET',
//     contentType: 'application/json',
//   }).done((data) => {
//     console.log(data);
//   });
// };