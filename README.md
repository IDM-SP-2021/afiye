# afiye

## Installation

Fork this repository to your account.

Clone the forked repository to your device using a git GUI or the command line.

Navigate to the repository on the command line

```shell
cd path/to/repository
```

Install project dependencies

```shell
npm install
```

Initialize an `.env` file with the following variable

```lang-none
NODE_ENV=development
```

Alternatively, to test a production build substitute `development` with `production`

## Run Application

From the command line run to open a development server

```shell
npm start
```

## Test Build Application

*Recommended that* `NODE_ENV` *be set to* `production` *in your* `.env`

From the command line run

```shell
npm run build
```

## Database Installation and Initialization

### Neo4j Desktop

Download and install Neo4j Desktop for your OS from the [Neo4j Downloads page](https://neo4j.com/download/?ref=try-neo4j-lphttps://neo4j.com/download/?ref=try-neo4j-lp)

### Database Initialization

Run the following Cypher query to load the database with the starting data:

```cypher
CREATE (Henderson:Family {fid: 'fbmqvTmHhcmPKQTKBWEdDiPVThhVbdDdmgpyriPWAwVIHaVrnuMIFLvbeTFoqUay'}),
(Jack:Person {fname: 'Jack', lname: 'Henderson', gender: 'M', birthday: '07-23-1978'}),
(Jill:Person {fname: 'Jill', lname: 'Henderson', gender: 'F', birthday: '02-01-1979'}),
(Abigail:Person {fname:'Abigail', lname: 'Henderson', pname:'Abby', gender: 'F', birthday: '11-30-2002'}),
(Jane:Person {fname:'Jane', lname: 'Henderson', gender:'F', birthday:'04-18-2004'}),
(Jack)-[:MEMBER]->(Henderson),
(Jill)-[:MEMBER]->(Henderson),
(Abigail)-[:MEMBER]->(Henderson),
(Jane)-[:MEMBER]->(Henderson),
(Jack)-[:RELATED {relation:'spouse'}]->(Jill),(Jack)<-[:RELATED {relation:'spouse'}]-(Jill),
(Jack)-[:RELATED {relation:'parent'}]->(Abigail),(Jack)<-[:RELATED {relation:'child'}]-(Abigail),
(Jack)-[:RELATED {relation:'parent'}]->(Jane),(Jack)<-[:RELATED {relation:'child'}]-(Jane),
(Jill)-[:RELATED {relation:'parent'}]->(Abigail),(Jill)<-[:RELATED {relation:'child'}]-(Abigail),
(Jill)-[:RELATED {relation:'parent'}]->(Jane),(Jill)<-[:RELATED {relation:'child'}]-(Jane),
(Abigail)-[:RELATED {relation:'sibling'}]->(Jane),(Abigail)<-[:RELATED {relation:'sibling'}]-(Jane)
```
