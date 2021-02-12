const neo4j = require('neo4j-driver');
const _ = require('lodash');

let driver = neo4j.driver(process.env.N4J_HOST, neo4j.auth.basic(process.env.N4J_USER, process.env.N4J_PASS));


const getData = () => {
  let session = driver.session();

  return session.run(
    'MATCH (p:Person)-[r:RELATED]->(t:Person) RETURN p, ID(t) AS tar_id, r.relation AS rel_type'
  )
  .then(results => {
    let nodes = [], rels = [];

    results.records.forEach(res => {
      const person = res.get('p'),
            id = person.identity.low,
            fname = person.properties.fname,
            lname = person.properties.lname,
            gender = person.properties.gender,
            birthday = person.properties.birthday,
            member = {id, fname, lname, gender, birthday},
            source = id.toString(),
            target = res.get('tar_id').low.toString(),
            relType = res.get('rel_type');
      if (!_.some(nodes, member)) {
        nodes.push(member);
      }
      rels.push({source, target, relType});
    });
    return {nodes, links: rels};
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