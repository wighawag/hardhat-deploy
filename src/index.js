const path = require('path');
const fs = require('fs');
const { traverse } = require('./utils');
const { task, extendEnvironment } = require('@nomiclabs/buidler/config');
const { readArtifactSync } = require('@nomiclabs/buidler/plugins');
const {addHelpers, transformNamedAccounts, waitForTx} = require('./utils/eth');

let chainId;
async function getChainId(bre) {
  if (chainId) {
    return chainId;
  }
  try {
    chainId = await bre.ethereum.send('eth_chainId');
  } catch (e) {
    console.log('failed to get chainId, falling back on net_version...');
    chainId = await bre.ethereum.send('net_version');
  }

  if (chainId.startsWith('0x')) {
    chainId = '' + parseInt(chainId.slice(2), 16); // TODO better
  }

  return chainId;
}

function loadAllDeployments(deploymentsPath) {
  const all = {};
  const deployPath = deploymentsPath || 'deployments';
  fs.readdirSync(deployPath).forEach((name) => {
    const fPath = path.resolve(deployPath, name);
    const stats = fs.statSync(fPath);
    if (stats.isDirectory()) {
      const contracts = loadDeployments(deploymentsPath, name);
      all[name] = contracts;
    }
  });
  return all;
}

function loadDeployments(deploymentsPath, chainId) {
  const contracts = {};
  const deployPath = path.join(deploymentsPath || 'deployments', chainId);
  let filesStats;
  try {
      filesStats = traverse(deployPath);
  } catch (e) {
      console.log('no folder at ' + deployPath);
      return {};
  }
  let fileNames = filesStats.map(a => a.relativePath);
  fileNames = fileNames.sort((a, b) => {
      if (a < b) { return -1; }
      if (a > b) { return 1; }
      return 0;
  });
  
  for (const fileName of fileNames) {
    if (fileName.substr(fileName.length-5) == '.json') {
      const deploymentFileName = path.join(deployPath, fileName);
      const deployment = JSON.parse(fs.readFileSync(deploymentFileName).toString());
      const name = fileName.slice(0, fileName.length-5);
      // console.log('fetching ' + deploymentFileName + '  for ' + name);
      contracts[name] = deployment;
    }
  }
  return contracts;
}

function addDeployments(db, deploymentsPath, chainId) {
  const contracts = loadDeployments(deploymentsPath, chainId);
  for (const key of Object.keys(contracts)) {
    db.deployments[key] = contracts[key];
  }
}

function addNamedAccounts(bre, accounts, chainId) {
  if (bre.config.namedAccounts) {
    bre.namedAccounts = transformNamedAccounts(bre.config.namedAccounts, chainId, accounts);
  } else {
    bre.namedAccounts = {};
  }
}

// console.log('plugin file');

module.exports = function() {
  // console.log('plugin func');
  const db = {
    deployments: {}
  }

  extendEnvironment(env => {
    // console.log('plugin extendEnvironment', env.buidlerArguments, env.config)
    
    const deploymentsPath = env.config.paths.deployments || 'deployments';
    const envChainId = process.env['BUIDLER__DEPLOY_PLUGIN_CHAIN_ID'];
    const envAccounts = process.env['BUIDLER__DEPLOY_PLUGIN_ACCOUNTS'];
    if (envChainId) {
      addNamedAccounts(env, envAccounts ? envAccounts.split('.') : [], envChainId)
      addDeployments(db, deploymentsPath, envChainId);
    }
    
    async function runDeployments(tags) {
      // console.log('runDeployments...');
      db.deployments = {}; // RESET
      await env.run('deploy:runDeploy', {tags, noSaving: true});
    }

    async function saveDeployment(name, {transactionHash, args, abi, address, linkedData, solidityJson, solidityMetadata}) {
      const chainId = await getChainId(env);
      const deploymentChainIds = env.config.deploymentChainIds || ['1', '2', '4', '42']; // TODO better default ?
      const toSave = !db.noSaving && deploymentChainIds.indexOf(chainId) !== -1;
      const filepath = path.join(env.config.paths.deployments || 'deployments', chainId, name + '.json');

      const obj = {transactionHash, args, abi, address, linkedData, solidityJson, solidityMetadata};
      db.deployments[name] = obj;
      if (typeof obj.address === 'undefined' && obj.transactionHash) {
        let receipt;
        try {
          receipt = await waitForTx(env.ethereum, obj.transactionHash, true);
          obj.address = receipt.contractAddress;
        } catch(e) {
          console.error(e);
          if (toSave) {
            console.log('deleting ' + filepath);
            fs.unlinkSync(filepath);
          }
          delete db.deployments[name];
          return;
        }
      }
      db.deployments[name] = obj;

      // console.log({chainId, typeOfChainId: typeof chainId});
      if (toSave) {
        console.log('writing ' + filepath);
        try { fs.mkdirSync(path.join(env.config.paths.deployments || 'deployments')); } catch (e) {}
        try { fs.mkdirSync(path.join(env.config.paths.deployments || 'deployments', chainId)); } catch (e) {}
        fs.writeFileSync(filepath, JSON.stringify(obj, null, '  '));
      }
    };
    
    env.deployments = env.deployments || {};
    env.deployments.save = saveDeployment;
    env.deployments.get = (name) => {
      return db.deployments[name];
    };
    env.deployments.all = () => {
      return db.deployments; // TODO copy
    };
    env.deployments.run = runDeployments;
    env.deployments.log = (...args) => {
      if (!db.noSaving) {
        console.log(...args)
      }
    }
    addHelpers(env, (contractName) => readArtifactSync(env.config.paths.artifacts, contractName));
  });

  internalTask('_resolveNamedAccounts', 'resolve named accounts', async(taskArguments, bre) => {
    const chainId = await getChainId(bre);
    const accounts = await bre.ethereum.send('eth_accounts');
    addNamedAccounts(bre, accounts, chainId);
  })

  internalTask('deploy:loadDeployments', 'load existing deployments')
  .setAction(async (args, bre, runSuper) => {
    const chainId = await getChainId(bre);
    addDeployments(db, bre.config.paths.deployments || 'deployments', chainId);
  });

  internalTask('deploy:runDeploy', 'execute the deployment scripts')
  .addOptionalParam('export', 'export deployment info into one file')
  .addOptionalParam('tags', 'dependencies to run')
  .addOptionalParam('node', 'specify node to connect to')
  .setAction(async (args, bre, runSuper) => {
    const deployPath = bre.config.paths.deploy || bre.config.paths.root + '/deploy'; // TODO extendConfig ?
    let filesStats;
    try {
        filesStats = traverse(deployPath);
    } catch (e) {
        console.log('no folder at ' + deployPath);
        return;
    }
    let fileNames = filesStats.map(a => a.relativePath);
    fileNames = fileNames.sort((a, b) => {
        if (a < b) { return -1; }
        if (a > b) { return 1; }
        return 0;
    });
    
    const scriptsBags = {};
    const scripts = [];
    for (const fileName of fileNames) {
      const scriptFilePath = deployPath + '/' + fileName;
      let deployScript;
      // console.log('fetching ' + scriptFilePath);
      try {
        deployScript = require(scriptFilePath);
        deployScript.__path = scriptFilePath;
      } catch(e) {
        console.error('require failed', e);
        throw 'ERROR processing skip func of ' + scriptFilePath + ':\n' + (e.stack || e);            
      }
      const tags = deployScript.tags;
      if (tags) {
        for (const tag of tags) {
          const bag = scriptsBags[tag] || [];
          scriptsBags[tag] = bag;
          bag.push(deployScript);
        }
      }
      if (args.tags) {
        let found = false;
        if (tags) {
          for (const tagToFind of args.tags) {
            for (const tag of tags) {
              if (tag === tagToFind) {
                scripts.push(deployScript);
                found = true;
                break;       
              }
            }
            if (found) {
              break;
            }
          }
        }
      } else {
        scripts.push(deployScript);
      }
    }

    
    const scriptsRegisteredToRun = {};
    const scriptsToRun = [];
    function recurseDependencies(deployScript) {
      if (deployScript.dependencies) {
        for (const dependency of deployScript.dependencies) {
          const scriptsToAdd = scriptsBags[dependency];
          if (scriptsToAdd) {
            for (const scriptToAdd of scriptsToAdd) {
              if (!scriptsRegisteredToRun[scriptsToAdd]) {
                recurseDependencies(scriptToAdd);
                scriptsToRun.push(scriptToAdd);
                scriptsRegisteredToRun[scriptsToAdd] = true;
              }
            }
          }
        }
      }
      if (!scriptsRegisteredToRun[deployScript]) {
        scriptsToRun.push(deployScript);
        scriptsRegisteredToRun[deployScript] = true;
      }
    }
    for (const deployScript of scripts) {
      recurseDependencies(deployScript);
    }

    if (args.noSaving) {
      db.noSaving = true;
    }
    try {
      const argsForScripts = [bre];
      for (const deployScript of scriptsToRun) {
        let skip = false;
        // console.log('trying ' + deployScript.__path);
        if (deployScript.skip) {
            try {
                skip = await deployScript.skip.apply(null, argsForScripts);
            } catch (e) {
              console.error('skip failed', e);
              throw 'ERROR processing skip func of ' + scriptFilePath + ':\n' + (e.stack || e);            
            }    
        }
        if (!skip) {
            try {
                await deployScript.apply(null, argsForScripts);
            } catch (e) {
              console.error('execution failed', e);
              throw 'ERROR processing ' + deployScript.__path + ':\n' + (e.stack || e);            
            }
        }
      }
    } catch(e) {
      db.noSaving = false;
      throw e;
    }
    db.noSaving = false;
    if (args.export) {
      const all = loadAllDeployments(bre.config.paths.deployments || 'deployments');
      all[chainId] = db.deployments;
      fs.writeFileSync(args.export, JSON.stringify(all, null, '  ')); // TODO remove bytecode ?
    }
  });

  task("deploy", "Deploy contracts")
  .addOptionalParam('export', 'export deployment info into one file')
  .addOptionalParam('node', 'specify node to connect to')
  .setAction(async (args, bre, runSuper) => {
    // await run('_resolveNamedAccounts');
    // await run('deploy:loadDeployments');
    await run('compile');
    await run('deploy:runDeploy', args);
  });

  task("compile")
  .setAction(async (args, bre, runSuper) => {
    await run('_resolveNamedAccounts');
    await run('deploy:loadDeployments');
    await runSuper(args);
  });

  task("run")
  .setAction(async (args, bre, runSuper) => {
    const chainId = await getChainId(bre);
    // console.log('run chainId ', chainId);
    bre.buidlerArguments._deployPluginChainId = chainId;
    const accounts = await bre.ethereum.send('eth_accounts');
    if (accounts.length > 0) {
      bre.buidlerArguments._deployPluginAccounts = accounts.join('.');
    }
    await runSuper(args);
  });

  // task("run")
  // .setAction(async (args, bre, runSuper) => {
  //   await run('_resolveNamedAccounts');
  //   await run('deploy:loadDeployments');
  //   console.log('deployments', db.deployments, bre.deployments.all())
  //   await runSuper(args);
  //   console.log('deployments', db.deployments, bre.deployments.all())
  // });

  // task("test")
  // .setAction(async (args, bre, runSuper) => {
  //   console.log('prepare test...');
  //   // await run('_resolveNamedAccounts');
  //   // await run('deploy:loadDeployments');
  //   await run('compile');
  //   await runSuper(args);
  // });

  // TODO (Currently does not work as we cannot override options for existing task)
  // task("node")
  // .addOptionalParam('export', 'export deployment info into one file')
  // .setAction(async (args, bre, runSuper) => {
  //   await run('deploy', args);

  //   // TODO remove ?
  //   const tmp = console.log.bind(console);
  //   console.log = (...args) => {
  //     if (args.length == 0 || args[0].startsWith('Account') || args[0].startsWith('=====') ){
        
  //     } else {
  //       tmp(...args)
  //     }
  //   };
  //   await runSuper(args);
  //   console.log = tmp;
  // });

  task("listen")
  .addOptionalParam('export', 'export deployment info into one file')
  .setAction(async (args, bre) => {
    await run('deploy', args);
    const tmp = console.log.bind(console);
    console.log = (...args) => {
      if (args.length == 0 || args[0].startsWith('Account') || args[0].startsWith('=====') ){
        
      } else {
        tmp(...args)
      }
    };
    await run('node', {...args, hostname: 'localhost', port: 8545});
    // this create a new BRE unfortinately, so no deployment are available there
    console.log = tmp;
  });

  // task("listen")
  // .addOptionalParam('export', 'export deployment info into one file')
  // .setAction(async (args, bre) => {
    
  //   const tmp = console.log.bind(console);
  //   console.log = (...args) => {
  //     if (args.length == 0 || args[0].startsWith('Account') || args[0].startsWith('=====') ){
        
  //     } else {
  //       tmp(...args)
  //     }
  //   };
  //   await run('node', {...args, hostname: 'localhost', port: 8545});
  //   // this create a new BRE unfortinately, so no deployment are available there
  //   console.log = tmp;

  //   console.log('node running');
  //   // so currently we connect it to afterward
  //   args.node = 'http://localhost:8545' // TODO somehow
  //   await run('deploy', args);
  // });
}