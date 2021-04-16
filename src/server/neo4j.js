// const neo4j = require('neo4j-driver').v1;
const neo4j = require('neo4j-driver');
const _ = require('lodash');

let driver = neo4j.driver(process.env.N4J_HOST, neo4j.auth.basic(process.env.N4J_USER, process.env.N4J_PASS));

const nodeObj = (node) => {
  let id = node.identity.low.toString(),
      props = node.properties,
      uid = props.uid,
      fid = props.fid,
      firstName = props.firstName,
      prefName = props.prefName,
      lastName = props.lastName,
      gender = props.gender,
      birthdate = props.birthdate,
      avatar = props.avatar,
      claimed = props.claimed,
      profileColor = props.profileColor,
      member;

  if (avatar === undefined) {
    avatar = '../assets/icons/user.svg';
  }

  member = {id, uid, fid, firstName, prefName, lastName, gender, birthdate, avatar, claimed, profileColor};
  return member;
};

// submit generic query
const submitQuery = (query) => {
  let session = driver.session();

  return session
    .run(query)
    .then(() => {
      console.log('Query successfully submitted');
    })
    .catch(err =>{
      throw err;
    })
    .finally(() => {
      return session.close();
    });
};

// GET /tree
// const getData = (user) => {
//   let session = driver.session();

//   return session.run(
//     `MATCH (p:Person)-[:MEMBER]->(:Family {fid: '${user.fid}'}) \
//     WITH p \
//     OPTIONAL MATCH (p)-[r:RELATED]->(t:Person) \
//     WHERE r.relation = "parent" OR r.relation = "child" OR r.relation = "sibling" OR r.relation = "spouse" \
//     RETURN p, ID(p) AS src_id, ID(t) AS tar_id, r.relation AS rel_type`
//   )
//   .then(results => {
//     let nodes = [], rels = [];

//     results.records.forEach(res => {
//       let person = res.get('p'),
//           id = person.identity.low.toString(),
//           uid = person.properties.uid,
//           fid = person.properties.fid,
//           firstName = person.properties.firstName,
//           prefName = person.properties.prefName,
//           lastName = person.properties.lastName,
//           gender = person.properties.gender,
//           birthdate = person.properties.birthdate,
//           avatar = person.properties.avatar,
//           profileColor = person.properties.profileColor,
//           member = {id, uid, fid, firstName, prefName, lastName, gender, birthdate, avatar, profileColor},
//           relType = res.get('rel_type'),
//           source = res.get('src_id'),
//           target = res.get('tar_id');
//       if (source !== null) {
//         source = source.toString();
//       }
//       if (target !== null) {
//         target = target.toString();
//       }
//       let link = {source, target, relType};
//       if (!_.some(nodes, member)) {
//         nodes.push(member);
//       }
//       if (!_.some(rels, link) && link.relType !== null && link.target !== null) {
//         rels.push(link);
//       }
//     });
//     return {nodes, links: rels};
//   })
//   .catch(err => {
//     throw err;
//   })
//   .finally(() => {
//     return session.close();
//   });
// };

const getData = async (user) => {
  let session = driver.session();
  let txc = session.beginTransaction();

  try {
    let family = [], nodes = [], rels = [];

    const result1 = await txc.run(
      'MATCH (p:Person)-[:MEMBER]->(:Family {fid: $fid}) \
      WITH collect(p) AS nodes \
      MATCH (u:Person {uid: $uid, fid: $fid}) \
      UNWIND nodes AS n \
      WITH * WHERE id(u) <> id(n) \
      MATCH path = allShortestPaths( (n)-[*..1]->(u) ) \
      RETURN nodes, relationships(path) AS relationship, n AS familyMem',
      {
        fid: user.fid,
        uid: user.uid
      }
    );
    result1.records.forEach(res => {
      let member = nodeObj(res.get('familyMem'));
          member.relation = res.get('relationship')[0].properties.relation;
      family.push(member);
    });

    const result2 = await txc.run(
      'MATCH (p:Person)-[:MEMBER]->(:Family {fid: $fid}) \
       WITH p \
       OPTIONAL MATCH (p)-[r:RELATED]->(t:Person) \
       WHERE r.relation = "parent" OR r.relation = "child" OR r.relation = "sibling" OR r.relation = "spouse" \
       RETURN p, ID(p) AS src_id, ID(t) AS tar_id, r.relation AS rel_type',
       {
         fid: user.fid
       }
    );
    result2.records.forEach(res => {
      let member = nodeObj(res.get('p')),
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
    });

    let graph = {nodes, links: rels};
    return {family, graph};
  } catch (error) {
    console.log(error);
    await txc.rollback();
    console.log('rolled back');
  } finally {
    await session.close();
  }
};

const getFamily = async (user) => {
  let session = driver.session();
  const txc = session.beginTransaction();
  try {
    let family = [];

    const result1 = await txc.run(
      'MATCH (u:Person {uid: $uid, fid: $fid}) RETURN u AS curr',
      {
        uid: user.uid,
        fid: user.fid
      }
    );
    result1.records.forEach(res => {
      let currentMem = nodeObj(res.get('curr'));
          currentMem.relation = 'That\'s You!';
      family.push(currentMem);
    });
    console.log('First query completed');

    const result2 = await txc.run(
      'MATCH (p:Person)-[:MEMBER]->(:Family {fid: $fid}) \
      WITH collect(p) AS nodes \
      MATCH (u:Person {uid: $uid, fid: $fid}) \
      UNWIND nodes AS n \
      WITH * WHERE id(u) <> id(n) \
      MATCH path = allShortestPaths( (n)-[*..1]->(u) ) \
      RETURN nodes, relationships(path) AS relationship, n AS familyMem',
      {
        fid: user.fid,
        uid: user.uid
      }
    );
    result2.records.forEach(res => {
      let member = nodeObj(res.get('familyMem'));
          member.relation = res.get('relationship')[0].properties.relation;
      family.push(member);
    });
    console.log('Second query completed');

    console.log('Family: ', family);
    return family;
  } catch (error) {
    console.log(error);
    await txc.rollback();
    console.log('rolled back');
  } finally {
    await session.close();
  }
};

const getNode = (node) => {
  let session = driver.session();

  return session
    .run(
      `MATCH (p:Person {uid:'${node}'}) RETURN p`
    )
    .then(results => {
      let result;

      results.records.forEach(res => {
        let node = res.get('p'),
            id = node.identity.low.toString(),
            props = node.properties,
            uid = props.uid,
            fid = props.fid,
            firstName = props.firstName,
            prefName = props.prefName,
            lastName = props.lastName,
            gender = props.gender,
            birthdate = props.birthdate,
            avatar = props.avatar,
            profileColor = props.profileColor,
            person = {id, uid, fid, firstName, prefName, lastName, gender, birthdate, avatar, profileColor};
        result = person;
      });
      return result;
    })
    .catch(err => {
      throw err;
    })
    .finally(() => {
      return session.close();
    });
};

// POST /welcome-make
const initFamily = (person) => {
  let session = driver.session();
  return session
    .run(
      `CREATE (${person.fid}:Family {fid: '${person.fid}', created: ${Date.now()}}),
      (${person.uid}:Person {
        uid: '${person.uid}',
        fid: '${person.fid}',
        firstName: '${person.firstName}',
        prefName: '${person.prefName}',
        lastName: '${person.lastName}',
        birthdate: '${person.birthdate}',
        gender: '${person.gender}',
        location: '${person.location}',
        profileColor: '${person.profileColor}',
        avatar: '${person.avatar}',
        claimed: ${person.claimed},
        created:${Date.now()}
      }),
      (${person.uid})-[:MEMBER {created: ${Date.now()}}]->(${person.fid})
      RETURN *`
    )
    // .then(results => {
    //   results.records.forEach(res => {
    //     console.log(res);
    //   });
    // })
    .catch(err => {
      throw err;
    })
    .finally(() => {
      return session.close();
    });
};

// Simplify multi-step relationship path to a one step relationship
const simplifyPath = (path) => {
  let simplified =
      (path == 'childspouse') ||
      (path == 'siblingchild')
        ? 'child' // Source is Son, Daughter, or Child to End

    : (path == 'spouseparent') ||
      (path == 'parentsibling')
        ? 'parent' // Source is Father, Mother, or Parent to End

    : (path == 'childparent') ||
      (path == 'siblingsibling')
        ? 'sibling' // Source is Brother, Sister, or Sibling to End

    : (path == 'childchild') ||
      (path == 'niblingchild') ||
      (path == 'siblinggrandchild') ||
      (path == 'childchildinLaw') ||
      (path == 'grandchildspouse')
        ? 'grandchild' // Source is Grandson, Granddaughter, or Grandchild to End

    : (path == 'grandchildchild') ||
      (path == 'greatgrandchildspouse') ||
      (path == 'childgrandchild')
        ? 'greatgrandchild' // Source is great-grandchild to End

    : (path == 'parentparent') ||
      (path == 'parentparsib') ||
      (path == 'grandparentsibling') ||
      (path == 'parentinlawparent') ||
      (path == 'spousegrandparent')
        ? 'grandparent' // Source is Grandfather, Grandmother, or Grandparent to End

    : (path == 'parentgrandparent') ||
      (path == 'spousegreatgrandparent') ||
      (path == 'grandparentparent')
        ? 'greatgrandparent' // Souce is great-grandparent to End

    : (path == 'spousesibling') ||
      (path == 'siblingspouse') ||
      (path == 'spousesiblingspouse') ||
      (path == 'spousesiblinginlaw') ||
      (path == 'siblinginlawspouse') ||
      (path == 'siblinginlawsibling')
        ? 'siblinginlaw' // Source is the Brother-in-Law, Sister-in-Law, or Sibling-in-Law to End

    : (path == 'spousechild') ||
      (path == 'siblinginlawchild') ||
      (path == 'childinlawspouse')
        ? 'childinlaw' // Source is Son-in-Law, Daughter-in-Law, or Child-in-Law to End

    : (path == 'parentspouse') ||
      (path == 'parentsiblinginlaw') ||
      (path == 'spouseparentinlaw')
        ? 'parentinlaw' // Source is Father-in-Law, Mother-in-Law, or Parent-in-Law to End

    : (path == 'siblingparent') ||
      (path == 'spousesiblingparent') ||
      (path == 'siblingspouseparent') ||
      (path == 'siblinginlawparent') ||
      (path == 'parsibsibling') ||
      (path == 'spouseparsib') ||
      (path == 'siblingparsib')
        ? 'parsib' // Source is Uncle, Aunt, or Parsib to End

    : (path == 'parsibparent')
        ? 'greatparsib'

    : (path == 'childsibling') ||
      (path == 'childsiblingspouse') ||
      (path == 'childspousesibling') ||
      (path == 'childsiblinginlaw') ||
      (path == 'siblingnibling') ||
      (path == 'niblingspouse') ||
      (path == 'niblingsibling')
        ? 'nibling' // Source is Nephew, Niece, or Nibling to End

    : (path == 'childnibling')
        ? 'greatnibling'

    : (path == 'childsiblingparent') ||
      (path == 'childparsib') ||
      (path == 'niblingparent') ||
      (path == 'siblingcousin')
        ? 'cousin'

    : (path == 'parentchild')
        ? 'spouse'

    : 'Extended Family'; // Relationship type is not defined for current path
  return simplified;
};

// POST /account/add-member
const addMember = (person) => {
  let { uid, fid, firstName, prefName, lastName, birthdate, gender, location, profileColor, relation, relReciprocal, related, avatar, claimed } = person;
  related = Number(related, 10);

  let session = driver.session();

  return session
    .run(
      `CREATE (${uid}:Person {
        uid: '${uid}',
        fid: '${fid}',
        firstName: '${firstName}',
        prefName: '${prefName}',
        lastName: '${lastName}',
        birthdate: '${birthdate}',
        gender: '${gender}',
        location: '${location}',
        profileColor: '${profileColor}',
        avatar: '${avatar}',
        claimed: ${claimed},
        created:${Date.now()}
      })
      WITH ${uid}
      MATCH (t:Person) WHERE ID(t)= ${related}
      MATCH (f:Family {fid: '${fid}'})
      MERGE (${uid})-[:RELATED {relation: '${relation}'}]->(t)
      MERGE (${uid})<-[:RELATED {relation: '${relReciprocal}'}]-(t)
      MERGE (${uid})-[:MEMBER {created: ${Date.now()}}]->(f)
      WITH f
      MATCH (p:Person)-[:MEMBER]->(:Family {fid: '${fid}'})
      WITH collect(p) AS nodes
      MATCH (n:Person {uid: '${uid}'})
      UNWIND nodes AS m
      WITH * WHERE id(n) <> id(m)
      MATCH path = allShortestPaths( (n)-[*..10]->(m) )
      MATCH revPath = allShortestPaths( (m)-[*..10]->(n) )
      RETURN nodes, n.uid AS start, n.firstName AS sName, relationships(path) AS relationship, m.uid AS end, m.firstName AS eName, relationships(revPath) AS revRelationship`
    )
    .then(results => {
      let directRelation = [];
      let members = results.records[0].get('nodes');

      results.records.forEach(res => {
        let relationPath = [],
            relReciprocalPath = [];
        const start = res.get('start'),
              end = res.get('end'),
              rel = res.get('relationship'),
              relRec = res.get('revRelationship');

        rel.forEach(r => {
          relationPath.push(r.properties.relation);
        });


        if (relationPath.length > 1) {
          const directPath = simplifyPath(relationPath.join('')),
                s = start,
                t = end;
          directRelation.push({s, directPath, t});
        }

        relRec.forEach(r => {
          relReciprocalPath.push(r.properties.relation);
        });

        if (relReciprocalPath.length > 1) {
          const directPath = simplifyPath(relReciprocalPath.join('')),
                s = end,
                t = start;
          directRelation.push({s, directPath, t});
        }

      });


      return [{members, directRelation}];
    })
    .catch(err => {
      throw err;
    })
    .finally(() => {
      return session.close();
    });
};

module.exports = {
  submitQuery: submitQuery,
  getData: getData,
  getFamily: getFamily,
  initFamily: initFamily,
  addMember: addMember,
  getNode: getNode,
};