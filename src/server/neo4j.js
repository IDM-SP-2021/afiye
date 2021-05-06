const neo4j = require('neo4j-driver');
const _ = require('lodash');
const { text } = require('body-parser');

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

const getFamily = async (uid, fid) => {
  console.log('Get family: ', uid, fid);
  let session = driver.session();
  const txc = session.beginTransaction();
  try {
    let family = [];

    const result1 = await txc.run(
      'MATCH (u:Person {uid: $uid, fid: $fid}) RETURN u AS curr',
      {
        uid: uid,
        fid: fid
      }
    );
    result1.records.forEach(res => {
      let currentMem = nodeObj(res.get('curr'));
          currentMem.relation = 'That\'s You!';
          console.log('Current member: ', currentMem);
      family.push(currentMem);
    });

    console.log('After current: ', family);

    const result2 = await txc.run(
      'MATCH (p:Person)-[:MEMBER]->(:Family {fid: $fid}) \
      WITH collect(p) AS nodes \
      MATCH (u:Person {uid: $uid, fid: $fid}) \
      UNWIND nodes AS n \
      WITH * WHERE id(u) <> id(n) \
      MATCH path = allShortestPaths( (n)-[*..1]->(u) ) \
      RETURN nodes, relationships(path) AS relationship, n AS familyMem',
      {
        fid: fid,
        uid: uid
      }
    );
    result2.records.forEach(res => {
      let member = nodeObj(res.get('familyMem'));
          member.relation = res.get('relationship')[0].properties.relation;
      family.push(member);
    });
    return family;
  } catch (error) {
    console.log(error);
    await txc.rollback();
    console.log('rolled back');
  } finally {
    await session.close();
  }
};

const getNode = (node, current) => {
  let session = driver.session(),
      query;

  if (node === current) {
    query = `MATCH (p:Person {uid:'${node}'}) RETURN p`;
  } else {
    query = `MATCH (p:Person {uid:'${node}'})-[r:RELATED]->(:Person {uid:'${current}'}) RETURN p, r`;
  }

  return session
    .run(query)
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
            relation;
        if (node === current) {
          relation = 'That\'s You!';
        } else {
          let rel = res.get('r');
          relation = rel.properties.relation;
        }
        let person = {id, uid, fid, firstName, prefName, lastName, gender, birthdate, avatar, profileColor, relation};
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
const initFamily = async (person, fakeData) => {
  const session = driver.session(),
        txc = session.beginTransaction();

  try {
    await txc.run(`
      CREATE (${person.fid}:Family {fid: '${person.fid}', created: ${Date.now()}}),
            (${person.uid}:Person { uid: '${person.uid}', fid: '${person.fid}', firstName: '${person.firstName}', prefName: '${person.prefName}', lastName: '${person.lastName}', birthdate: '${person.birthdate}', gender: '${person.gender}', location: '${person.location}', profileColor: '${person.profileColor}', avatar: '${person.avatar}', claimed: ${person.claimed}, created:${Date.now()} }),
            (${person.uid})-[:MEMBER {created: ${Date.now()}}]->(${person.fid})
      RETURN *
    `);
    console.log(fakeData);
    if (fakeData === 'on') {
      await txc.run(
        "MATCH (u:Person {uid: $uid, fid: $fid})-[:MEMBER]->(:Family {fid: $fid}) \
      WITH (u) \
      CREATE (Merle:Person {uid: 'uMvpyb1d1FZ', fid: $fid, firstName: 'Merle', prefName: '', lastName: 'Favian', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268291/fakeData/avatars/avatar-merle_fmcgvf.jpg', gender: 'M', birthdate: '1979-2-15', location: 'NC', profileColor: 'profileColor-yellow', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Estell:Person {uid: 'uvRM0o3GMMk', fid: $fid, firstName: 'Estell', prefName: '', lastName: 'Mortimer', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-estelle_ee345t.jpg', gender: 'F', birthdate: '1976-8-25', location: 'KS', profileColor: 'profileColor-orange', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Angelo:Person {uid: 'uY37aMiKkeA', fid: $fid, firstName: 'Angelo', prefName: '', lastName: 'Drew', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-angelo_qqlcua.jpg', gender: 'M', birthdate: '1984-4-5', location: 'TN', profileColor: 'profileColor-black', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Vance:Person {uid: 'ukvFelkp5Lb', fid: $fid, firstName: 'Vance', prefName: '', lastName: 'Jamaal', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268291/fakeData/avatars/avatar-vance_lxw14p.jpg', gender: 'M', birthdate: '1985-9-2', location: 'NJ', profileColor: 'profileColor-magenta', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Ashlee:Person {uid: 'uaQyOZy8fEn', fid: $fid, firstName: 'Ashlee', prefName: '', lastName: 'Callie', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-ashlee_tszyjv.jpg', gender: 'F', birthdate: '1952-6-25', location: 'ID', profileColor: 'profileColor-purple', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Harold:Person {uid: 'uphXLVN5uAJ', fid: $fid, firstName: 'Harold', prefName: '', lastName: 'Abdullah', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-harold_r2910m.jpg', gender: 'M', birthdate: '1949-7-9', location: 'VA', profileColor: 'profileColor-teal', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Aglae:Person {uid: 'uLKLVWWsWnA', fid: $fid, firstName: 'Aglae', prefName: '', lastName: 'Camylle', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-aglae_i1mcw7.jpg', gender: 'F', birthdate: '1944-3-14', location: 'DE', profileColor: 'profileColor-yellow', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Florence:Person {uid: 'u9X1vbsZZ7Q', fid: $fid, firstName: 'Florence', prefName: '', lastName: 'Shanon', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-florence_znbtnn.jpg', gender: 'F', birthdate: '1983-6-12', location: 'OH', profileColor: 'profileColor-orange', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Barney:Person {uid: 'uBwHalH88Sj', fid: $fid, firstName: 'Barney', prefName: '', lastName: 'Garrison', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-barney_qo66db.jpg', gender: 'M', birthdate: '2006-5-4', location: 'RI', profileColor: 'profileColor-red', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
      (Ayden:Person {uid: 'uQb3B552iNL', fid: $fid, firstName: 'Ayden', prefName: '', lastName: 'Hattie', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-ayden_ymoaro.jpg', gender: 'M', birthdate: '2008-8-13', location: 'WV', profileColor: 'profileColor-purple', claimed: 'false', created: 1620243429331, type: 'fakeData'}), \
      (Mark :Person {uid: 'uRQKKly4WV7', fid: $fid, firstName: 'Mark', prefName: '', lastName: 'Mollie', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-mark_kavbji.jpg', gender: 'M', birthdate: '1996-7-20', location: 'PA', profileColor: 'profileColor-green', claimed: 'false', created: 1620243429331, type: 'fakeData'}), \
      (Delta:Person {uid: 'u4XVfzSrhpx', fid: $fid, firstName: 'Delta', prefName: '', lastName: 'Cleveland', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-delta_tzzyzx.jpg', gender: 'F', birthdate: '2000-4-25', location: 'FL', profileColor: 'profileColor-brown', claimed: 'false', created: 1620243429331, type: 'fakeData'}), \
      (Vance)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Vance)-[:RELATED {relation: 'child'}]->(Ashlee), (Ashlee)-[:RELATED {relation: 'parent'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'parsib'}]->(Barney), (Barney)-[:RELATED {relation: 'nibling'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'Extended Family'}]->(Aglae), (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'parsib'}]->(Ayden), (Ayden)-[:RELATED {relation: 'nibling'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'child'}]->(Harold), (Harold)-[:RELATED {relation: 'parent'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'sibling'}]->(Merle), (Merle)-[:RELATED {relation: 'sibling'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'siblinginlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'siblinginlaw'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'parsib'}]->(Mark), (Mark)-[:RELATED {relation: 'nibling'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'siblinginlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'siblinginlaw'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'parsib'}]->(Delta), (Delta)-[:RELATED {relation: 'nibling'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'sibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'sibling'}]->(Vance), \
      (Vance)-[:RELATED {relation: 'parsib'}]->(u), (u)-[:RELATED {relation: 'nibling'}]->(Vance), \
      (Ashlee)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Barney), (Barney)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'Extended Family'}]->(Aglae), (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Ayden), (Ayden)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'spouse'}]->(Harold), (Harold)-[:RELATED {relation: 'spouse'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'parent'}]->(Merle), (Merle)-[:RELATED {relation: 'child'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'parentinlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'childinlaw'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Mark), (Mark)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'parentinlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'childinlaw'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Delta), (Delta)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'parent'}]->(Angelo), (Angelo)-[:RELATED {relation: 'child'}]->(Ashlee), \
      (Ashlee)-[:RELATED {relation: 'grandparent'}]->(u), (u)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
      (Barney)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Barney)-[:RELATED {relation: 'Extended Family'}]->(Aglae), (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'sibling'}]->(Ayden), (Ayden)-[:RELATED {relation: 'sibling'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'grandchild'}]->(Harold), (Harold)-[:RELATED {relation: 'grandparent'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'nibling'}]->(Merle), (Merle)-[:RELATED {relation: 'parsib'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'child'}]->(Florence), (Florence)-[:RELATED {relation: 'parent'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'cousin'}]->(Mark), (Mark)-[:RELATED {relation: 'cousin'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'nibling'}]->(Estell), (Estell)-[:RELATED {relation: 'parsib'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'cousin'}]->(Delta),  (Delta)-[:RELATED {relation: 'cousin'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'child'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parent'}]->(Barney), \
      (Barney)-[:RELATED {relation: 'cousin'}]->(u), (u)-[:RELATED {relation: 'cousin'}]->(Barney), \
      (Aglae)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Ayden), (Ayden)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Harold), (Harold)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'parentinlaw'}]->(Merle), (Merle)-[:RELATED {relation: 'childinlaw'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Florence), (Florence)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'grandparent'}]->(Mark), (Mark)-[:RELATED {relation: 'grandchild'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'parent'}]->(Estell), (Estell)-[:RELATED {relation: 'child'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'grandparent'}]->(Delta), (Delta)-[:RELATED {relation: 'grandchild'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Angelo), (Angelo)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
      (Aglae)-[:RELATED {relation: 'grandparent'}]->(u), (u)-[:RELATED {relation: 'grandchild'}]->(Aglae), \
      (Ayden)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Ayden)-[:RELATED {relation: 'grandchild'}]->(Harold), (Harold)-[:RELATED {relation: 'grandparent'}]->(Ayden), \
      (Ayden)-[:RELATED {relation: 'nibling'}]->(Merle), (Merle)-[:RELATED {relation: 'parsib'}]->(Ayden), \
      (Ayden)-[:RELATED {relation: 'child'}]->(Florence), (Florence)-[:RELATED {relation: 'parent'}]->(Ayden), \
      (Ayden)-[:RELATED {relation: 'cousin'}]->(Mark), (Mark)-[:RELATED {relation: 'cousin'}]->(Ayden), \
      (Ayden)-[:RELATED {relation: 'nibling'}]->(Estell), (Estell)-[:RELATED {relation: 'parsib'}]->(Ayden), \
      (Ayden)-[:RELATED {relation: 'cousin'}]->(Delta), (Delta)-[:RELATED {relation: 'cousin'}]->(Ayden), \
      (Ayden)-[:RELATED {relation: 'child'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parent'}]->(Ayden), \
      (Ayden)-[:RELATED {relation: 'cousin'}]->(u), (u)-[:RELATED {relation: 'cousin'}]->(Ayden), \
      (Harold)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Harold)-[:RELATED {relation: 'parent'}]->(Merle), (Merle)-[:RELATED {relation: 'child'}]->(Harold), \
      (Harold)-[:RELATED {relation: 'parentinlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'childinlaw'}]->(Harold), \
      (Harold)-[:RELATED {relation: 'grandparent'}]->(Mark), (Mark)-[:RELATED {relation: 'grandchild'}]->(Harold), \
      (Harold)-[:RELATED {relation: 'parentinlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'childinlaw'}]->(Harold), \
      (Harold)-[:RELATED {relation: 'grandparent'}]->(Delta), (Delta)-[:RELATED {relation: 'grandchild'}]->(Harold), \
      (Harold)-[:RELATED {relation: 'parent'}]->(Angelo), (Angelo)-[:RELATED {relation: 'child'}]->(Harold), \
      (Harold)-[:RELATED {relation: 'grandparent'}]->(u), (u)-[:RELATED {relation: 'grandchild'}]->(Harold), \
      (Merle)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Merle)-[:RELATED {relation: 'siblinginlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'siblinginlaw'}]->(Merle), \
      (Merle)-[:RELATED {relation: 'parent'}]->(Mark), (Mark)-[:RELATED {relation: 'child'}]->(Merle), \
      (Merle)-[:RELATED {relation: 'spouse'}]->(Estell), (Estell)-[:RELATED {relation: 'spouse'}]->(Merle), \
      (Merle)-[:RELATED {relation: 'parent'}]->(Delta), (Delta)-[:RELATED {relation: 'child'}]->(Merle), \
      (Merle)-[:RELATED {relation: 'sibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'sibling'}]->(Merle), \
      (Merle)-[:RELATED {relation: 'parent'}]->(u), (u)-[:RELATED {relation: 'child'}]->(Merle), \
      (Florence)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Florence)-[:RELATED {relation: 'parsib'}]->(Mark), (Mark)-[:RELATED {relation: 'nibling'}]->(Florence), \
      (Florence)-[:RELATED {relation: 'siblinginlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'siblinginlaw'}]->(Florence), \
      (Florence)-[:RELATED {relation: 'parsib'}]->(Delta), (Delta)-[:RELATED {relation: 'nibling'}]->(Florence), \
      (Florence)-[:RELATED {relation: 'spouse'}]->(Angelo), (Angelo)-[:RELATED {relation: 'spouse'}]->(Florence), \
      (Florence)-[:RELATED {relation: 'parsib'}]->(u), (u)-[:RELATED {relation: 'nibling'}]->(Florence), \
      (Mark)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Mark)-[:RELATED {relation: 'child'}]->(Estell), (Estell)-[:RELATED {relation: 'parent'}]->(Mark), \
      (Mark)-[:RELATED {relation: 'sibling'}]->(Delta), (Delta)-[:RELATED {relation: 'sibling'}]->(Mark), \
      (Mark)-[:RELATED {relation: 'nibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parsib'}]->(Mark), \
      (Mark)-[:RELATED {relation: 'sibling'}]->(u), (u)-[:RELATED {relation: 'sibling'}]->(Mark), \
      (Estell)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Estell)-[:RELATED {relation: 'parent'}]->(Delta), (Delta)-[:RELATED {relation: 'child'}]->(Estell), \
      (Estell)-[:RELATED {relation: 'siblinginlaw'}]->(Angelo), (Angelo)-[:RELATED {relation: 'siblinginlaw'}]->(Estell), \
      (Estell)-[:RELATED {relation: 'parent'}]->(u), (u)-[:RELATED {relation: 'child'}]->(Estell), \
      (Delta)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Delta)-[:RELATED {relation: 'nibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parsib'}]->(Delta), \
      (Delta)-[:RELATED {relation: 'sibling'}]->(u), (u)-[:RELATED {relation: 'sibling'}]->(Delta), \
      (Angelo)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
      (Angelo)-[:RELATED {relation: 'parsib'}]->(u), (u)-[:RELATED {relation: 'nibling'}]->(Angelo) \
      RETURN *",
      {
        uid: person.uid,
        fid: person.fid,
        time: Date.now()
      }
      );
    }

    await txc.commit();
  } catch (error) {
    console.log(error);
    await txc.rollback();
    console.log('rolled back');
  } finally {
    await session.close();
  }
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

// const fakeData = async (user) => {
//   const session = driver.session(),
//         txc = session.beginTransaction();

//   try {
//     const crFamily = await txc.run(
//       "MATCH (u:Person {uid: $uid, fid: $fid})-[:MEMBER]->(:Family {fid: $fid}) \
//       WITH (u) \
//       CREATE (Merle:Person {uid: 'uMvpyb1d1FZ', fid: $fid, firstName: 'Merle', prefName: '', lastName: 'Favian', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268291/fakeData/avatars/avatar-merle_fmcgvf.jpg', gender: 'M', location: 'NC', profileColor: 'profileColor-yellow', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Estell:Person {uid: 'uvRM0o3GMMk', fid: $fid, firstName: 'Estell', prefName: '', lastName: 'Mortimer', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-estelle_ee345t.jpg', gender: 'F', location: 'KS', profileColor: 'profileColor-orange', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Angelo:Person {uid: 'uY37aMiKkeA', fid: $fid, firstName: 'Angelo', prefName: '', lastName: 'Drew', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-angelo_qqlcua.jpg', gender: 'M', location: 'TN', profileColor: 'profileColor-black', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Vance:Person {uid: 'ukvFelkp5Lb', fid: $fid, firstName: 'Vance', prefName: '', lastName: 'Jamaal', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268291/fakeData/avatars/avatar-vance_lxw14p.jpg', gender: 'M', location: 'NJ', profileColor: 'profileColor-magenta', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Ashlee:Person {uid: 'uaQyOZy8fEn', fid: $fid, firstName: 'Ashlee', prefName: '', lastName: 'Callie', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-ashlee_tszyjv.jpg', gender: 'F', location: 'ID', profileColor: 'profileColor-purple', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Harold:Person {uid: 'uphXLVN5uAJ', fid: $fid, firstName: 'Harold', prefName: '', lastName: 'Abdullah', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-harold_r2910m.jpg', gender: 'M', location: 'VA', profileColor: 'profileColor-teal', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Aglae:Person {uid: 'uLKLVWWsWnA', fid: $fid, firstName: 'Aglae', prefName: '', lastName: 'Camylle', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-aglae_i1mcw7.jpg', gender: 'F', location: 'DE', profileColor: 'profileColor-yellow', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Florence:Person {uid: 'u9X1vbsZZ7Q', fid: $fid, firstName: 'Florence', prefName: '', lastName: 'Shanon', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-florence_znbtnn.jpg', gender: 'F', location: 'OH', profileColor: 'profileColor-orange', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Barney:Person {uid: 'uBwHalH88Sj', fid: $fid, firstName: 'Barney', prefName: '', lastName: 'Garrison', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-barney_qo66db.jpg', gender: 'M', location: 'RI', profileColor: 'profileColor-red', claimed: 'false', created: 1620243429330, type: 'fakeData'}), \
//       (Ayden:Person {uid: 'uQb3B552iNL', fid: $fid, firstName: 'Ayden', prefName: '', lastName: 'Hattie', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-ayden_ymoaro.jpg', gender: 'M', location: 'WV', profileColor: 'profileColor-purple', claimed: 'false', created: 1620243429331, type: 'fakeData'}), \
//       (Mark :Person {uid: 'uRQKKly4WV7', fid: $fid, firstName: 'Mark', prefName: '', lastName: 'Mollie', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268131/fakeData/avatars/avatar-mark_kavbji.jpg', gender: 'M', location: 'PA', profileColor: 'profileColor-green', claimed: 'false', created: 1620243429331, type: 'fakeData'}), \
//       (Delta:Person {uid: 'u4XVfzSrhpx', fid: $fid, firstName: 'Delta', prefName: '', lastName: 'Cleveland', avatar: 'https://res.cloudinary.com/afiye-io/image/upload/v1620268130/fakeData/avatars/avatar-delta_tzzyzx.jpg', gender: 'F', location: 'FL', profileColor: 'profileColor-brown', claimed: 'false', created: 1620243429331, type: 'fakeData'}), \
//       (Vance)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Vance)-[:RELATED {relation: 'child'}]->(Ashlee), (Ashlee)-[:RELATED {relation: 'parent'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'parsib'}]->(Barney), (Barney)-[:RELATED {relation: 'nibling'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'Extended Family'}]->(Aglae), (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'parsib'}]->(Ayden), (Ayden)-[:RELATED {relation: 'nibling'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'child'}]->(Harold), (Harold)-[:RELATED {relation: 'parent'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'sibling'}]->(Merle), (Merle)-[:RELATED {relation: 'sibling'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'siblinginlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'siblinginlaw'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'parsib'}]->(Mark), (Mark)-[:RELATED {relation: 'nibling'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'siblinginlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'siblinginlaw'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'parsib'}]->(Delta), (Delta)-[:RELATED {relation: 'nibling'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'sibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'sibling'}]->(Vance), \
//       (Vance)-[:RELATED {relation: 'parsib'}]->(u), (u)-[:RELATED {relation: 'nibling'}]->(Vance), \
//       (Ashlee)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Barney), (Barney)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'Extended Family'}]->(Aglae), (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Ayden), (Ayden)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'spouse'}]->(Harold), (Harold)-[:RELATED {relation: 'spouse'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'parent'}]->(Merle), (Merle)-[:RELATED {relation: 'child'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'parentinlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'childinlaw'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Mark), (Mark)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'parentinlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'childinlaw'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'grandparent'}]->(Delta), (Delta)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'parent'}]->(Angelo), (Angelo)-[:RELATED {relation: 'child'}]->(Ashlee), \
//       (Ashlee)-[:RELATED {relation: 'grandparent'}]->(u), (u)-[:RELATED {relation: 'grandchild'}]->(Ashlee), \
//       (Barney)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Barney)-[:RELATED {relation: 'Extended Family'}]->(Aglae), (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'sibling'}]->(Ayden), (Ayden)-[:RELATED {relation: 'sibling'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'grandchild'}]->(Harold), (Harold)-[:RELATED {relation: 'grandparent'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'nibling'}]->(Merle), (Merle)-[:RELATED {relation: 'parsib'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'child'}]->(Florence), (Florence)-[:RELATED {relation: 'parent'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'cousin'}]->(Mark), (Mark)-[:RELATED {relation: 'cousin'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'nibling'}]->(Estell), (Estell)-[:RELATED {relation: 'parsib'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'cousin'}]->(Delta),  (Delta)-[:RELATED {relation: 'cousin'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'child'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parent'}]->(Barney), \
//       (Barney)-[:RELATED {relation: 'cousin'}]->(u), (u)-[:RELATED {relation: 'cousin'}]->(Barney), \
//       (Aglae)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Ayden), (Ayden)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Harold), (Harold)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'parentinlaw'}]->(Merle), (Merle)-[:RELATED {relation: 'childinlaw'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Florence), (Florence)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'grandparent'}]->(Mark), (Mark)-[:RELATED {relation: 'grandchild'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'parent'}]->(Estell), (Estell)-[:RELATED {relation: 'child'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'grandparent'}]->(Delta), (Delta)-[:RELATED {relation: 'grandchild'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'Extended Family'}]->(Angelo), (Angelo)-[:RELATED {relation: 'Extended Family'}]->(Aglae), \
//       (Aglae)-[:RELATED {relation: 'grandparent'}]->(u), (u)-[:RELATED {relation: 'grandchild'}]->(Aglae), \
//       (Ayden)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Ayden)-[:RELATED {relation: 'grandchild'}]->(Harold), (Harold)-[:RELATED {relation: 'grandparent'}]->(Ayden), \
//       (Ayden)-[:RELATED {relation: 'nibling'}]->(Merle), (Merle)-[:RELATED {relation: 'parsib'}]->(Ayden), \
//       (Ayden)-[:RELATED {relation: 'child'}]->(Florence), (Florence)-[:RELATED {relation: 'parent'}]->(Ayden), \
//       (Ayden)-[:RELATED {relation: 'cousin'}]->(Mark), (Mark)-[:RELATED {relation: 'cousin'}]->(Ayden), \
//       (Ayden)-[:RELATED {relation: 'nibling'}]->(Estell), (Estell)-[:RELATED {relation: 'parsib'}]->(Ayden), \
//       (Ayden)-[:RELATED {relation: 'cousin'}]->(Delta), (Delta)-[:RELATED {relation: 'cousin'}]->(Ayden), \
//       (Ayden)-[:RELATED {relation: 'child'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parent'}]->(Ayden), \
//       (Ayden)-[:RELATED {relation: 'cousin'}]->(u), (u)-[:RELATED {relation: 'cousin'}]->(Ayden), \
//       (Harold)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Harold)-[:RELATED {relation: 'parent'}]->(Merle), (Merle)-[:RELATED {relation: 'child'}]->(Harold), \
//       (Harold)-[:RELATED {relation: 'parentinlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'childinlaw'}]->(Harold), \
//       (Harold)-[:RELATED {relation: 'grandparent'}]->(Mark), (Mark)-[:RELATED {relation: 'grandchild'}]->(Harold), \
//       (Harold)-[:RELATED {relation: 'parentinlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'childinlaw'}]->(Harold), \
//       (Harold)-[:RELATED {relation: 'grandparent'}]->(Delta), (Delta)-[:RELATED {relation: 'grandchild'}]->(Harold), \
//       (Harold)-[:RELATED {relation: 'parent'}]->(Angelo), (Angelo)-[:RELATED {relation: 'child'}]->(Harold), \
//       (Harold)-[:RELATED {relation: 'grandparent'}]->(u), (u)-[:RELATED {relation: 'grandchild'}]->(Harold), \
//       (Merle)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Merle)-[:RELATED {relation: 'siblinginlaw'}]->(Florence), (Florence)-[:RELATED {relation: 'siblinginlaw'}]->(Merle), \
//       (Merle)-[:RELATED {relation: 'parent'}]->(Mark), (Mark)-[:RELATED {relation: 'child'}]->(Merle), \
//       (Merle)-[:RELATED {relation: 'spouse'}]->(Estell), (Estell)-[:RELATED {relation: 'spouse'}]->(Merle), \
//       (Merle)-[:RELATED {relation: 'parent'}]->(Delta), (Delta)-[:RELATED {relation: 'child'}]->(Merle), \
//       (Merle)-[:RELATED {relation: 'sibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'sibling'}]->(Merle), \
//       (Merle)-[:RELATED {relation: 'parent'}]->(u), (u)-[:RELATED {relation: 'child'}]->(Merle), \
//       (Florence)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Florence)-[:RELATED {relation: 'parsib'}]->(Mark), (Mark)-[:RELATED {relation: 'nibling'}]->(Florence), \
//       (Florence)-[:RELATED {relation: 'siblinginlaw'}]->(Estell), (Estell)-[:RELATED {relation: 'siblinginlaw'}]->(Florence), \
//       (Florence)-[:RELATED {relation: 'parsib'}]->(Delta), (Delta)-[:RELATED {relation: 'nibling'}]->(Florence), \
//       (Florence)-[:RELATED {relation: 'spouse'}]->(Angelo), (Angelo)-[:RELATED {relation: 'spouse'}]->(Florence), \
//       (Florence)-[:RELATED {relation: 'parsib'}]->(u), (u)-[:RELATED {relation: 'nibling'}]->(Florence), \
//       (Mark)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Mark)-[:RELATED {relation: 'child'}]->(Estell), (Estell)-[:RELATED {relation: 'parent'}]->(Mark), \
//       (Mark)-[:RELATED {relation: 'sibling'}]->(Delta), (Delta)-[:RELATED {relation: 'sibling'}]->(Mark), \
//       (Mark)-[:RELATED {relation: 'nibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parsib'}]->(Mark), \
//       (Mark)-[:RELATED {relation: 'sibling'}]->(u), (u)-[:RELATED {relation: 'sibling'}]->(Mark), \
//       (Estell)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Estell)-[:RELATED {relation: 'parent'}]->(Delta), (Delta)-[:RELATED {relation: 'child'}]->(Estell), \
//       (Estell)-[:RELATED {relation: 'siblinginlaw'}]->(Angelo), (Angelo)-[:RELATED {relation: 'siblinginlaw'}]->(Estell), \
//       (Estell)-[:RELATED {relation: 'parent'}]->(u), (u)-[:RELATED {relation: 'child'}]->(Estell), \
//       (Delta)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Delta)-[:RELATED {relation: 'nibling'}]->(Angelo), (Angelo)-[:RELATED {relation: 'parsib'}]->(Delta), \
//       (Delta)-[:RELATED {relation: 'sibling'}]->(u), (u)-[:RELATED {relation: 'sibling'}]->(Delta), \
//       (Angelo)-[:MEMBER {created: $time}]->(:Family {fid: $fid}), \
//       (Angelo)-[:RELATED {relation: 'parsib'}]->(u), (u)-[:RELATED {relation: 'nibling'}]->(Angelo) \
//       RETURN *",
//       {
//         uid: user.uid,
//         fid: user.fid,
//         time: Date.now()
//       }
//     );
//     crFamily.records.forEach(res => {
//       console.log('Created node');
//       console.log(res);
//     });

//     await txc.commit();
//   } catch (error) {
//     console.log(error);
//     await txc.rollback();
//     console.log('rolled back');
//   } finally {
//     await session.close();
//   }
// };

module.exports = {
  submitQuery: submitQuery,
  getData: getData,
  getFamily: getFamily,
  initFamily: initFamily,
  addMember: addMember,
  getNode: getNode,
  // fakeData: fakeData,
};