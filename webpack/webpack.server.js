const path = require('path');
const nodeExternals = require('webpack-node-externals');
const loaders = require('./loaders');

module.exports = (env, argv) => {
  const SERVER_PATH = (argv.mode === 'production') ?
    path.join(__dirname, '../src/server/server-prod.js') :
    path.join(__dirname, '../src/server/server-dev.js');

  let config = {
    target: 'node',
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: [nodeExternals()],
    module: {
      rules: [
        loaders.JSLoader,
        loaders.ViewLoader,
      ]
    },
    resolve: {
      extensions: ['*', '.js', '.jsx']
    },
  };

  let configServer = Object.assign({}, config, {
    name: 'configServer',
    entry: {
      server: SERVER_PATH,
      neo4j: path.join(__dirname, '../src/server/neo4j.js'),
    },
    output: {
      path: path.join(__dirname, '../dist/server'),
      publicPath: '/',
      filename: '[name].js',
    }
  });

  let configServerConfigs = Object.assign({}, config, {
    name: 'configServerConfigs',
    entry: {
      auth: path.join(__dirname, '../src/server/config/auth.js'),
      passport: path.join(__dirname, '../src/server/config/passport.js'),
    },
    output: {
      path: path.join(__dirname, '../dist/server/config'),
      filename: '[name].js',
    }
  });

  let configRoutes = Object.assign({}, config, {
    name: 'configRoutes',
    entry: {
      index: path.join(__dirname, '../src/routes/index.js'),
      account: path.join(__dirname, '../src/routes/account.js'),
    },
    output: {
      path: path.join(__dirname, '../dist/routes'),
      publicPath: '/routes',
      filename: '[name].js',
    }
  });

  return [configServer, configServerConfigs, configRoutes];
};