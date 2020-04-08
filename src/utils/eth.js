const {Web3Provider} = require('@ethersproject/providers');
const {Contract, ContractFactory} = require('@ethersproject/contracts');
const {BigNumber} = require('@ethersproject/bignumber');
const {Logger} = require('@ethersproject/logger');
// TODO investigate : (for now skip)
try {
  // console.log('disable ethers log');
  Logger.setLogLevel('off');
} catch (e) {
  console.error(e);
}

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
function addHelpers(env, deploymentsExtension, getArtifact) {
  
  function init() {
    if (!provider) {
      provider = new Web3Provider(env.ethereum); // new EthersProviderWrapper(env.ethereum);
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
    const Artifact = await getArtifact(contractName);
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
    let ethersContract
    // try {
      ethersContract = await factory.deploy(...args, overrides);
    // } catch (e) {
      // console.error('cannot deploy', e);
      // throw e;
    // }
    
    const tx = ethersContract.deployTransaction;
    const transactionHash = tx.hash;
    if (register) {
       await env.deployments.save(name, {
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

    let receipt;
    // try {
      receipt = await tx.wait(); // TODO return tx.wait
    // } catch (e) {
      // console.log({name, options, contractName, ...args});
      // console.error('cannot deploy', e);
      // throw e;
    // }

    const address = receipt.contractAddress;
    const contract = {address, abi};

    if (register) {
      await env.deployments.save(name, {
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
    const deployment = await env.deployments.get(name);
    if (!deployment) {
        return null;
    }
    let receipt;
    try {
      receipt = await provider.getTransactionReceipt(deployment.transactionHash);
    } catch (e) {
      console.error('cannot get receipt', e);
      throw e;
    }
    return { contract: {address: deployment.address, abi : deployment.abi}, transactionHash: deployment.transactionHash, receipt };
  }

  async function fetchIfDifferent(fieldsToCompare, name, options, contractName, ...args) {
    if (typeof fieldsToCompare === 'string') {
      fieldsToCompare = [fieldsToCompare];
    }
    const deployment = await env.deployments.get(name);
    if (deployment) {
        const transaction = await provider.getTransaction(deployment.transactionHash);
        if (transaction) {
            const Artifact = await getArtifact(contractName);
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

  async function batchTxAndWait(txs, batchOptions) {
    const promises = [];
    const currentNonces = {}
    for (const tx of txs) {
      const options = tx[0];
      let from = options.from;
      let ethersSigner;
      if(from.length >= 64) {
        if(from.length == 64) {
          from = '0x' + from;
        }
        ethersSigner = new Wallet(from);
        from = ethersSigner.address;
      } else {
        try {
          ethersSigner = provider.getSigner(from);
        } catch{}
      }
      // console.log(tx);
      const nonce = options.nonce || currentNonces[from] || await provider.getTransactionCount(from);
      tx[0].nonce = nonce;
      currentNonces[from] = nonce + 1;
      promises.push(sendTxAndWait(...tx));
    }
    if (batchOptions.dev_forceMine) {
      try {
        await provider.send('evm_mine', []);
      } catch(e) {}
    }
    await Promise.all(promises);
  }

  // TODO ?
  async function sendTxAndWaitOnlyFrom(from, options, contractName, methodName, ...args) {
    const deployment = await env.deployments.get(contractName);
    const abi = deployment.abi;
    const ethersContract = new Contract(deployment.address, abi, provider);
    if (from.toLowerCase() !== options.from.toLowerCase()) {
      const {data} = ethersContract.populateTransaction[methodName](...args);
      const to = ethersContract.address;
      console.log(options.from + ' has no right to ' + methodName);

      console.log('Please execute the following as ' + from);
      console.log(JSON.stringify({
        to,
        data,
      }, null, '  '));
      console.log('if you have an interface use the following');
      console.log(JSON.stringify({
        to,
        method: methodName,
        args,
      }, null, '  '));
      if (options.skipError) {
        return null;
      }
      throw new Error('ABORT, ACTION REQUIRED, see above');
    }
    return sendTxAndWait(options, contractName, methodName, ...args);
  }

  async function sendTxAndWait(options, contractName, methodName, ...args) {
    // console.log({
    //     options, contractName, methodName, args
    // });
    let from = options.from;
    let ethersSigner;
    if(from.length >= 64) {
      if(from.length == 64) {
        from = '0x' + from;
      }
      ethersSigner = new Wallet(from);
      from = ethersSigner.address;
    } else {
      try {
        ethersSigner = provider.getSigner(from);
      } catch{}
  }

    let tx;
    if (contractName) {
      const deployment = await env.deployments.get(contractName);
      const abi = deployment.abi
      const overrides = {
        gasLimit: options.gas,
        gasPrice: options.gasPrice ? BigNumber.from(options.gasPrice) : undefined,  // TODO cinfig
        value: options.value ? BigNumber.from(options.value) : undefined,
        nonce: options.nonce,
        chainId: options.chainId,
      }
      if (!ethersSigner) { // ethers.js : would be nice to be able to estimate even if not access to signer (see below)
        console.error('no signer for ' + from);
        console.log('Please execute the following as ' + from);
        const ethersContract = new Contract(deployment.address, abi, provider); 
        const ethersArgs = args ? args.concat([overrides]) : [overrides];
        const data = await ethersContract.populateTransaction[methodName](...ethersArgs);
        console.log(JSON.stringify({
          to: deployment.address,
          data,
        }, null, '  '));
        console.log('if you have an interface use the following');
        console.log(JSON.stringify({
          to: deployment.address,
          method: methodName,
          args,
        }, null, '  '));
        throw new Error('ABORT, ACTION REQUIRED, see above')
      } else {
        const ethersContract = new Contract(deployment.address, abi, ethersSigner);
        if (!overrides.gasLimit) {
          overrides.gasLimit = options.estimateGasLimit;
          const ethersArgs = args ? args.concat([overrides]) : [overrides];
          // console.log(ethersContract.estimate);
          overrides.gasLimit = (await ethersContract.estimateGas[methodName](...ethersArgs)).toNumber(); 
          if (options.estimateGasExtra) {
            overrides.gasLimit = overrides.gasLimit + options.estimateGasExtra;
            if (options.estimateGasLimit) {
                overrides.gasLimit = Math.min(overrides.gasLimit, options.estimateGasLimit);
            }
          }
        }
        const ethersArgs = args ? args.concat([overrides]) : [overrides];
        tx = await ethersContract.functions[methodName](...ethersArgs);
      }
    } else {
      if (!ethersSigner) { // ethers.js : would be nice to be able to estimate even if not access to signer (see below)
        console.error('no signer for ' + from);
      } else {
        const transactionData = {
          to: options.to,
          gasLimit: options.gas,
          gasPrice: options.gasPrice ? BigNumber.from(options.gasPrice) : undefined, // TODO cinfig
          value: options.value ? BigNumber.from(options.value) : undefined,
          nonce: options.nonce,
          data: options.data,
          chainId: options.chainId,
        }
        tx = await ethersSigner.sendTransaction(transactionData);
      }
    }
    if (options.dev_forceMine) {
      try {
        await provider.send('evm_mine', []);
      } catch(e) {}
    }
    return tx.wait();
  }

  async function rawCall(to, data) { // TODO call it eth_call?
    return provider.send('eth_call', [{
        to,
        data
    }, 'latest']); // TODO overrides
}

async function call(options, contractName, methodName, ...args) {
    if (typeof options === 'string') {
        if(typeof methodName !== 'undefined') {
            args.unshift(methodName);
        }
        methodName = contractName;
        contractName = options;
        options = {};
    }
    if (typeof args === 'undefined') {
        args = [];
    }
    let from = options.from;
    let ethersSigner;
    if(from && from.length >= 64) {
        if(from.length == 64) {
            from = '0x' + from;
        }
        ethersSigner = new Wallet(from);
        from = ethersSigner.address;
    }
    if(!ethersSigner) {
        ethersSigner = provider; // TODO rename ethersSigner
    }
    const deployment = await env.deployments.get(contractName);
    if (!deployment) {
        throw new Error(`no contract named "${contractName}"`);
    }
    const abi = deployment.abi
    const overrides = {
      gasLimit: options.gas,
      gasPrice: options.gasPrice ? BigNumber.from(options.gasPrice) : undefined,  // TODO cinfig
      value: options.value ? BigNumber.from(options.value) : undefined,
      nonce: options.nonce,
      chainId: options.chainId,
    }
    const ethersContract = new Contract(deployment.address, abi, ethersSigner);
    if (options.outputTx) {
        const method = ethersContract.populateTransaction[methodName];
        if (!method) {
            throw new Error(`no method named "${methodName}" on contract "${contractName}"`);
        }
        if(args.length > 0) {
            return method(...args, overrides);
        } else {
            return method(overrides);
        } 
    }
    const method = ethersContract.callStatic[methodName];
    if (!method) {
        throw new Error(`no method named "${methodName}" on contract "${contractName}"`);
    }
    if(args.length > 0) {
        return method(...args, overrides);
    } else {
        return method(overrides);
    }
  }

  deploymentsExtension.call = call;
  deploymentsExtension.rawCall = rawCall;
  deploymentsExtension.deploy = deploy;
  deploymentsExtension.deployIfDifferent = deployIfDifferent;
  deploymentsExtension.sendTxAndWait = sendTxAndWait;
  deploymentsExtension.batchTxAndWait = batchTxAndWait;
}

function chainConfig(object, chainId, networkConfigName) {
  if (typeof object[networkConfigName] != 'undefined') {
    return object[networkConfigName];
  } else if (typeof object["" + chainId] != 'undefined') {
      return object["" + chainId];
  } else if (typeof object[chainId] != 'undefined') {
      return object[chainId];
  } else {
      return object['default'];
  }
}

function transformNamedAccounts(configNamedAccounts, chainId, accounts, networkConfigName) {
  const namedAccounts = {}
  // TODO transform into checksum  address
  if (configNamedAccounts) {
    const accountNames = Object.keys(configNamedAccounts);
    function parseSpec(spec) {
      let address;
      switch (typeof spec) {
        case "string":
          if (spec.slice(0, 5) == "from:") {
            const from = parseInt(spec.substr(5));
            address = [];
            if (accounts) {
              for (let j = from; j < accounts.length; j++) {
                address.push(accounts[j]);
              }
            }
          } else if (spec.slice(0, 2).toLowerCase() == "0x") {
            address = spec;
          } else {
            address = parseSpec(configNamedAccounts[spec])
          }
          break;
        case "number":
          if (accounts) {
            address = accounts[spec];
          }
          break;
        case "undefined":
            break;
        case "object":
          if (spec) {
            if (spec.type == 'object') {
              address = spec;
            } else if (Array.isArray(spec)) {
              address = [];
              for (let j = 0; j < spec.length; j++) {
                address.push(parseSpec(spec[j]));
              }
            } else {
              const newSpec = chainConfig(spec, chainId, networkConfigName);
              if(typeof newSpec != 'undefined') {
                address = parseSpec(newSpec);
              }
            }
          }
          break;
      }
      return address;
    }

    for (let i = 0; i < accountNames.length; i++) {
      const accountName = accountNames[i];
      const spec = configNamedAccounts[accountName];
      namedAccounts[accountName] = parseSpec(spec);
    }
  }
  return namedAccounts;
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