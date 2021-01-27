const neo4j = require('neo4j-driver').v1;
// Needed for Hot Module Replacement
if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}
console.log('From neo4j.js');

const neo4jHost = process.env.N4J_HOST;
const neo4jUser = process.env.N4J_USER;
const neo4jPass = process.env.N4J_PASS;

let driver = neo4j.driver(neo4jHost, neo4j.auth.basic(neo4jUser, neo4jPass));

console.log(driver);

const initDB = (familyID) => {
  let session = driver.session();

  console.log(familyID);

  return session;
};

exports.initDB = initDB;