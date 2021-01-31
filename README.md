# afiye

---

## Installation

Fork this repository to your account.

Clone the forked repository to your device using a git GUI or the command line.

Navigate to the repository on the command line

```bash
cd path/to/repository
```

Install project dependencies

```bash
npm install
```

Create a `.env` file in the main directory of the repository.

## Database Installation and Initialization

### Neo4j

#### Neo4j Desktop

Download and install Neo4j Desktop for your OS from the [Neo4j Downloads page](https://neo4j.com/download/?ref=try-neo4j-lphttps://neo4j.com/download/?ref=try-neo4j-lp)

#### Database Initialization

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

### Mongo DB

#### Install Mongo DB Community Edition



## Run Application

From the command line run the following command to open a development server. This will not generate any files on your system as they are saved into memory.

> **IMPORTANT:** Make sure the database is running in Neo4j Desktop

```bash
npm run buildDev && npm start
```

## Test Build Application

*Recommended that* `NODE_ENV` *be set to* `production` *in your* `.env`

From the command line run the following command to build the project. This will populate the `dist` directory with the browser ready project files.

```bash
npm run buildProd
```

## Contribution Guidelines

### Code Best Practices

| Category | Description | Example |
| -------- | ----------- | ------- |
| File Naming | Use camelcase | `someFile.js` |
| `.scss` partials | Prefix with `_` | `_buttons.scss` |
| `scss` variables, classes, etc. | Separate words with `-` | `.some-class` |
| `js` variables, functions, etc. | Use camecase | `const submitMember` |

Use two space indents in all code files. This can be configured in your editor.

Preceed every `js` function with a comment describing its usage.

If `html` content will be dynamically added via `js` add a comment within the container element stating what will be added and by what function(s) to easily track.

Do not include links or references to `css` or `js` files in `html` files as they will be dynically added at build time with hash naming to avoid cache issues.

Any new `scss` partials must be included in `styles.scss` or it will not be compiled.

**DO NOT** touch anything in the Webpack folder unless you explicitly know what you are doing or have a hankering for a headache. Trust me. You will break it and we will all be sad.

Anything that should be included in the build must be included in the `src` directory or a subdirectory therein.

Please let Erik know if you are including a new file type in the build as this must be added to the build process.

Currently supports:

- HTML
- JS
- SCSS
- PNG
- JPEG
- GIF

### Pull Requests

All edits must be made in a forked version of this repository and submitted via a Pull Request (PR). Each PR must request a minimum of one reviewer, preferably one working on the same or a similar topic to the contents of your PR.

Prior to submitting a PR, ensure that your forked version has been synced with the latest version of the master repository to minimize merge conflicts. For information about syncing your repository please see the following:

- [GitHub Desktop](https://stackoverflow.com/questions/46110615/how-to-sync-your-forked-repo-with-original-repo-in-github-desktop)
- [Command Line](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)

Every PR must be appropriately named. The title should reference the feature or bug being addressed by the changes. The description should provide an overview of changes and should be written in clear language that defines terms being used unless previously defined in project documentation.

### Approvals

Before a PR can be approved, reviewers must clone the changes to their machine and thoroughly test the build for any bugs. Any bugs should be reported in the review and the PR sent back to the author for correction before it can be merged into the master repository.

If a build is unsuccessful, the PR will be rejected.

If the code contains any errors or warnings per the project linting tools, the PR will be rejected.

If the code does not adhere to the Code Best Practices outlined above, the PR will be rejected.
