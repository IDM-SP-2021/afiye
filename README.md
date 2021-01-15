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
