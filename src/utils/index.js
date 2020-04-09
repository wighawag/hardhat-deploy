const fs = require('fs');
const path = require('path');
const {transformNamedAccounts} = require('./eth');

const nameToChainId = {
  mainnet: "1",
  eth: "1",
  rinkeby: "4",
  kovan: "42",
  xdai: "100",
  sokol: "77",
  ropsten: "3",
}

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

function loadAllDeployments(deploymentsPath, onlyABIAndAddress) {
  const all = {};
  fs.readdirSync(deploymentsPath).forEach((fileName) => {
    const fPath = path.resolve(deploymentsPath, fileName);
    const stats = fs.statSync(fPath);
    let name = fileName;
    if (stats.isDirectory()) {
      let chainId;
      const _index = fileName.lastIndexOf("_");
      if (_index === -1) {
        chainId = nameToChainId[fileName];
        if (chainId === undefined) {
          const num = parseInt(fileName, 10);
          if (typeof num === "number" && !isNaN(num)) {
            chainId = fileName;
          } else {
            throw new Error(`invalid chainId on deployments folder name: ${fileName}`);
          }
        }
      } else {
        chainId = fileName.substr(_index + 1);
        name = fileName.substr(0, _index);
      }
      if (!all[chainId]) {
        all[chainId] = [];
      }
      const contracts = loadDeployments(deploymentsPath, fileName, onlyABIAndAddress);
      all[chainId].push({
        name,
        contracts
      });
    }
  });
  return all;
}

function loadDeployments(deploymentsPath, subPath, onlyABIAndAddress) {
  const contracts = {};
  const deployPath = path.join(deploymentsPath, subPath);
  let filesStats;
  try {
      filesStats = traverse(deployPath);
  } catch (e) {
      // console.log('no folder at ' + deployPath);
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
      let deployment = JSON.parse(fs.readFileSync(deploymentFileName).toString());
      if (onlyABIAndAddress) {
        deployment = {
          address: deployment.address,
          abi: deployment.abi,
          linkedData: deployment.linkedData
        };
      }
      const name = fileName.slice(0, fileName.length-5);
      // console.log('fetching ' + deploymentFileName + '  for ' + name);
      contracts[name] = deployment;
    }
  }
  return contracts;
}

function addDeployments(db, deploymentsPath, subPath) {
  const contracts = loadDeployments(deploymentsPath, subPath);
  for (const key of Object.keys(contracts)) {
    db.deployments[key] = contracts[key];
  }
}

function addNamedAccounts(bre, accounts, chainId) {
  if (bre.config.namedAccounts) {
    bre.namedAccounts = transformNamedAccounts(bre.config.namedAccounts, chainId, accounts, bre.network.name);
  } else {
    bre.namedAccounts = {};
  }
}


const traverse = function(dir, result = [], topDir, filter) {
    fs.readdirSync(dir).forEach((name) => {
        const fPath = path.resolve(dir, name);
        const stats = fs.statSync(fPath);
        if(!filter || filter(name, stats)) {
            const fileStats = { name, path: fPath, relativePath: path.relative(topDir || dir, fPath), mtimeMs: stats.mtimeMs, directory: stats.isDirectory() };
            if (fileStats.directory) {
                result.push(fileStats);
                return traverse(fPath, result, topDir || dir)
            }
            result.push(fileStats);
        }
    });
    return result;
};

module.exports = {
    traverse,
    getChainId,
    addDeployments,
    addNamedAccounts,
    loadAllDeployments,
    nameToChainId,
}
