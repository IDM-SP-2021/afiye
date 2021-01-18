const neo4j = require('neo4j-driver').v1;
console.log('From neo4j.js');

const neo4jHost = process.env.N4J_HOST;
const neo4jUser = process.env.N4J_USER;
const neo4jPass = process.env.N4J_PASS;
console.log(neo4jHost, neo4jUser, neo4jPass);
let driver = neo4j.driver(neo4jHost, neo4j.auth.basic(neo4jUser,neo4jPass));

const initDB = (familyID) => {
  let session = driver.session();

  console.log(familyID);

  return session;
};

exports.initDB = initDB;