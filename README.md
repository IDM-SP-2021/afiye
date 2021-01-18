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

Create a `.env` file in the main directory of the repository.

## Database Installation and Initialization

### Neo4j Desktop

Download and install Neo4j Desktop for your OS from the [Neo4j Downloads page](https://neo4j.com/download/?ref=try-neo4j-lphttps://neo4j.com/download/?ref=try-neo4j-lp)

### Database Initialization

Open Neo4j Desktop.

In the center panel click the `Add` button and select `Local DBMS` from the drop down options.

Name the database. This is just for your reference and will not be meaningful within the application.
*Recommended names for organization:* `afiye` or `afiye-main`

Set a database password. This can be anything (strong passwords are not necessary for local development), but note it for later.

From the version drop down select `4.2.2`. At time of writing, this is the latest version.

Create and start the database.

Make sure the database is selected in the list and select the the details tab. Copy the Bolt port, by default this is `https://localhost:7687`.

Add the following variables to your `.env` file.

```none
N4J_HOST=https://localhost:7687
N4J_USER=neo4j
N4J_PASS=abcde
```

*Notes:* `N4J_HOST` will be whatever is listed in the details panel in Neo4j Desktop. `N4J_USER` defaults to `neo4j` and should not be changed. `N4J_PASS` will be whatever you set it to during the database setup.

Open the database in Neo4j Browser (this is the default behavior of the blue open button in Neo4j Desktop).

Run the following Cypher query in the query box (top box that has the text `neo4j$` in it) to load the database with the starting data:

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

*Optional:* Back in the main Neo4j Desktop window rename the project for organizational purposes by hovering over the name (default `Neo4j Primer Project`) in the center panel and clicking the edit icon.

## Run Application

From the command line run the following command to open a development server. This will not generate any files on your system as they are saved into memory.

```shell
npm start
```

## Test Build Application

*Recommended that* `NODE_ENV` *be set to* `production` *in your* `.env`

From the command line run the following command to build the project. This will populate the `dist` directory with the browser ready project files.

```shell
npm run build
```
