const {Web3Provider} = require('@ethersproject/providers');
const {Contract, ContractFactory} = require('@ethersproject/contracts');

function EthersProviderWrapper(web3Provider, network) {
  Web3Provider.call(this, web3Provider, network);
  this._sendAsync = async (request, callback) => {
    let result;
    try {
      result = await web3Provider.send(request.method, request.params);
      callback(null, {result});
    } catch (e) {
      callback(e, null);
    }
  };
}
EthersProviderWrapper.prototype = Object.create(Web3Provider.prototype);

function linkLibrary(bytecode, libraryName, libraryAddress) {
  // TODO
  // const address = libraryAddress.replace('0x', '');
  // const encodedLibraryName = ethers.utils
  //     .solidityKeccak256(['string'], [libraryName])
  //     .slice(2, 36);
  // const pattern = new RegExp(`_+\\$${encodedLibraryName}\\$_+`, 'g');
  // if (!pattern.exec(bytecode)) {
  //     throw new Error(`Can't link '${libraryName}' (${encodedLibraryName}). in \n----\n ${bytecode}\n----\n`);
  // }
  // return bytecode.replace(pattern, address);
}

let provider;
function addHelpers(env, getArtifact) {
  
  function init() {
    if (!provider) {
      provider = new EthersProviderWrapper(env.ethereum);
    }
  }

  async function deploy(name, options, contractName, ...args) {
    init();
    let register = true;
    if (typeof name != 'string') {
        register = false;
        args.unshift(contractName);
        contractName = options;
        options = name;
    }
    let from = options.from;
    let ethersSigner;
    if (!from) {
        throw new Error('no from specified');
    }
    if(from.length >= 64) {
        if(from.length == 64) {
            from = '0x' + from;
        }
        ethersSigner = new Wallet(from);
        from = ethersSigner.address;
    } else {
        ethersSigner = provider.getSigner(from);
    }
    const Artifact = getArtifact(contractName);
    const abi = Artifact.abi;
    let byteCode = Artifact.bytecode
    if (options && options.libraries) {
        for (const libName of Object.keys(options.libraries)) {
            const libAddress = options.libraries[libName];
            byteCode = linkLibrary(byteCode, libName, libAddress);
        }
    }
    const factory = new ContractFactory(abi, byteCode, ethersSigner);
    
    const overrides = {
        gasLimit: options.gas,
        gasPrice: options.gasPrice,
        value: options.value,
        nonce: options.nonce,
        chainId: options.chainId,
    }
    const ethersContract = await factory.deploy(...args, overrides);
    const tx = ethersContract.deployTransaction;
    const transactionHash = tx.hash;
    if (register) {
        env.deployments.save(name, {
            address: null,
            abi,
            transactionHash,
            args,
            linkedData: options.linkedData,
        });
    }
    if (options.dev_forceMine) {
        try {
            await provider.send('evm_mine', []);
        } catch(e) {}
    }
    const receipt = await tx.wait(); // TODO return tx.wait
    const address = receipt.contractAddress;
    const contract = {address, abi};

    if (register) {
      env.deployments.save(name, {
        address: contract.address,
        abi,
        transactionHash,
        args,
        linkedData: options.linkedData
      });
    }
    return {
        contract,
        transactionHash,
        receipt,
        newlyDeployed: true,
    };
  };

  async function getDeployedContractWithTransactionHash(name) {
    const deployment = env.deployments.get(name);
    if (!deployment) {
        return null;
    }
    const receipt = await provider.getTransactionReceipt(deployment.transactionHash);
    return { contract: {address: deployment.address, abi : deployment.abi}, transactionHash: deployment.transactionHash, receipt };
  }

  async function fetchIfDifferent(fieldsToCompare, name, options, contractName, ...args) {
    if (typeof fieldsToCompare === 'string') {
      fieldsToCompare = [fieldsToCompare];
    }
    const deployment = env.deployments.get(name);
    if (deployment) {
        const transaction = await provider.getTransaction(deployment.transactionHash);
        if (transaction) {
            const Artifact = getArtifact(contractName);
            const abi = Artifact.abi;
            const factory = new ContractFactory(abi, Artifact.bytecode, provider.getSigner(options.from));

            const compareOnData = fieldsToCompare.indexOf('data') != -1;
            const compareOnInput = fieldsToCompare.indexOf('input') != -1;

            let data;
            if (compareOnData || compareOnInput) {
                const deployStruct = factory.getDeployTransaction(...args);
                data = deployStruct.data;
                // console.log(JSON.stringify(data, null, '  '));
            }
            const newTransaction = {
                data: compareOnData ? data : undefined,
                input: compareOnInput ? data : undefined,
                gas: options.gas,
                gasPrice: options.gasPrice,
                value: options.value,
                from: options.from
            };

            transaction.data = transaction.data || transaction.input;
            transaction.input = transaction.input || transaction.data;
            for (let i = 0; i < fieldsToCompare.length; i++) {
                const field = fieldsToCompare[i];
                if (typeof newTransaction[field] == 'undefined') {
                    throw new Error('field ' + field + ' not specified in new transaction, cant compare');
                }
                if (transaction[field] != newTransaction[field]) {
                    return true;
                }
            }
            return false;
        }
    }
    return true;
  }

  async function deployIfDifferent(fieldsToCompare, name, options, contractName, ...args) {
    init();
    const differences = await fetchIfDifferent(fieldsToCompare, name, options, contractName, ...args);
    if (differences) {
        return deploy(name, options, contractName, ...args);
    } else {
        return getDeployedContractWithTransactionHash(name);
    }
  }

  env.deployments = env.deployments || {};
  env.deployments.deploy = deploy;
  env.deployments.deployIfDifferent = deployIfDifferent;
}

function transformNamedAccounts(namedAccounts, chainId, accounts) {
  const result = {};
  const names = Object.keys(namedAccounts);
  for (const name of names) {
    result[name] = accounts[namedAccounts[name]]; // TODO
  }
  return result;
}

function pause(duration) {
  return new Promise((res) => setTimeout(res, duration * 1000));
}

async function waitForTx(ethereum, txHash, isContract) {
  let receipt
  while(true) {
    try {
      receipt = await ethereum.send('eth_getTransactionReceipt', [txHash]);
    } catch (e) {
      
    }
    if (receipt && receipt.blockNumber) {
      if (isContract) {
        if (!receipt.contractAddress) {
          throw new Error('contract not deployed');
        } else {
          return receipt;
        }
      } else {
        return receipt;
      }
    }
    pause(2);
  }
}

module.exports = {
  addHelpers,
  transformNamedAccounts,
  waitForTx
}