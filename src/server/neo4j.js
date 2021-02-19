// const neo4j = require('neo4j-driver').v1;
const neo4j = require('neo4j-driver');
const _ = require('lodash');

let driver = neo4j.driver(process.env.N4J_HOST, neo4j.auth.basic(process.env.N4J_USER, process.env.N4J_PASS));

const getData = (user) => {
  let session = driver.session();

  return session.run(
    `MATCH (p:Person)-[:MEMBER]->(:Family {fid: '${user.fid}'}) \
    WITH p \
    OPTIONAL MATCH (p)-[r:RELATED]->(t:Person) \
    WHERE r.relation = "parent" OR r.relation = "child" OR r.relation = "sibling" OR r.relation = "spouse" \
    RETURN p, ID(p) AS src_id, ID(t) AS tar_id, r.relation AS rel_type`
  )
  .then(results => {
    let nodes = [], rels = [];

    results.records.forEach(res => {
      let person = res.get('p'),
          id = person.identity.low.toString(),
          firstName = person.properties.firstName,
          prefName = person.properties.prefName,
          lastName = person.properties.lastName,
          gender = person.properties.gender,
          birthday = person.properties.birthday,
          member = {id, firstName, prefName, lastName, gender, birthday},
          relType = res.get('rel_type'),
          source = res.get('src_id'),
          target = res.get('tar_id');
      if (source !== null) {
        source = source.toString();
      }
      if (target !== null) {
        target = target.toString();
      }
      let link = {source, target, relType};
      if (!_.some(nodes, member)) {
        nodes.push(member);
      }
      if (!_.some(rels, link) && link.relType !== null && link.target !== null) {
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

const initFamily = (person) => {
  let query = `CREATE (${person.fid}:Family {fid: '${person.fid}', created: ${Date.now()}}), (${person.uid}:Person {uid: '${person.uid}', firstName: '${person.firstName}', prefName: '${person.prefName}', lastName: '${person.lastName}', birthdate: '${person.birthdate}', gender: '${person.gender}', location: '${person.location}', profileColor: '${person.profileColor}', created:${Date.now()}}), (${person.uid})-[:MEMBER {created: ${Date.now()}}]->(${person.fid}) RETURN *`;
  console.log(person);
  console.log(query);

  let session = driver.session();

  return session
    .run(query)
    .catch(err => {
      throw err;
    })
    .finally(() => {
      return session.close();
    });
};

module.exports = {
  getData: getData,
  initFamily: initFamily,
};