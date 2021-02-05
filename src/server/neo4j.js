const neo4j = require('neo4j-driver');

let driver = neo4j.driver(process.env.N4J_HOST, neo4j.auth.basic(process.env.N4J_USER, process.env.N4J_PASS));

const getData = () => {
  let session = driver.session();

  session.run(
    'MATCH (p:Person) \
     RETURN p'
  )
  .then(results => {
    let members = [];

    results.records.forEach(res => {
      const member = res.get('p'),
            id = member.identity.low,
            fName = member.properties.fname,
            lName = member.properties.lname,
            birthday = member.properties.birthday,
            gender = member.properties.gender;

      members.push({id, fName, lName, birthday, gender});
      // console.log(res.get('p'));
    });

    // return members;
    console.log(members);
  })
  .catch(err => {
    throw err;
  })
  .finally(() => {
    return session.close();
  });
};

module.exports = {
  getData: getData,
};