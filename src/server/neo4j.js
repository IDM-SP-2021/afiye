// const neo4j = require('neo4j-driver').v1;
const neo4j = require('neo4j-driver');
const _ = require('lodash');

let driver = neo4j.driver(process.env.N4J_HOST, neo4j.auth.basic(process.env.N4J_USER, process.env.N4J_PASS));


const getData = () => {
  let session = driver.session();

  return session.run(
    'MATCH (p:Person) \
    WITH p \
    MATCH (s:Person)-[r:RELATED]->(t:Person) \
    WHERE r.relation = "parent" \
    OR r.relation = "child" \
    OR r.relation = "sibling" \
    OR r.relation = "spouse" \
    RETURN p, ID(s) AS src_id, ID(t) AS tar_id, r.relation AS rel_type'
  )
  .then(results => {
    let nodes = [], rels = [];

    results.records.forEach(res => {
      const person = res.get('p'),
            id = person.identity.low.toString(),
            fname = person.properties.fname,
            lname = person.properties.lname,
            gender = person.properties.gender,
            birthday = person.properties.birthday,
            member = {id, fname, lname, gender, birthday},
            relType = res.get('rel_type'),
            source = res.get('src_id').toString(),
            target = res.get('tar_id').toString(),
            link = {source, target, relType};
      if (!_.some(nodes, member)) {
        nodes.push(member);
      }
      if (!_.some(rels, link)) {
        rels.push(link);
      }
      // rels.push({source, target, relType});
    });
    console.log(nodes);
    console.log(rels);
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