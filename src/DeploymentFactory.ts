import {
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/providers';
import {ContractFactory, PayableOverrides, Signer} from 'ethers';
import {Artifact} from 'hardhat/types';
import * as zk from 'zksync-web3';
import {Address, ExtendedArtifact} from '../types';
import {getAddress} from '@ethersproject/address';
import {keccak256 as solidityKeccak256} from '@ethersproject/solidity';
import {hexConcat} from '@ethersproject/bytes';

export class DeploymentFactory {
  private factory: ContractFactory;
  private artifact: Artifact | ExtendedArtifact;
  private isZkSync: boolean;
  private getArtifact: (name: string) => Promise<Artifact>;
  private overrides: PayableOverrides;
  private args: any[];
  constructor(
    getArtifact: (name: string) => Promise<Artifact>,
    artifact: Artifact | ExtendedArtifact,
    args: any[],
    network: any,
    ethersSigner?: Signer | zk.Signer,
    overrides: PayableOverrides = {}
  ) {
    this.overrides = overrides;
    this.getArtifact = getArtifact;
    this.isZkSync = network.zksync;
    this.artifact = artifact;
    if (this.isZkSync) {
      this.factory = new zk.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        ethersSigner as zk.Signer
      );
    } else {
      this.factory = new ContractFactory(
        artifact.abi,
        artifact.bytecode,
        ethersSigner
      );
    }
    const numArguments = this.factory.interface.deploy.inputs.length;
    if (args.length !== numArguments) {
      throw new Error(
        `expected ${numArguments} constructor arguments, got ${args.length}`
      );
    }
    this.args = args;
  }

  // TODO add ZkSyncArtifact
  private async extractFactoryDeps(artifact: any): Promise<string[]> {
    // Load all the dependency bytecodes.
    // We transform it into an array of bytecodes.
    const factoryDeps: string[] = [];
    for (const dependencyHash in artifact.factoryDeps) {
      const dependencyContract = artifact.factoryDeps[dependencyHash];
      const dependencyBytecodeString = (
        await this.getArtifact(dependencyContract)
      ).bytecode;
      factoryDeps.push(dependencyBytecodeString);
    }

    return factoryDeps;
  }

  public async getDeployTransaction(): Promise<TransactionRequest> {
    let overrides = this.overrides;
    if (this.isZkSync) {
      const factoryDeps = await this.extractFactoryDeps(this.artifact);
      const customData = {
        customData: {
          factoryDeps,
          feeToken: zk.utils.ETH_ADDRESS,
        },
      };
      overrides = {
        ...overrides,
        ...customData,
      };
    }

    return this.factory.getDeployTransaction(...this.args, overrides);
  }

  private async calculateEvmCreate2Address(
    create2DeployerAddress: Address,
    salt: string
  ): Promise<Address> {
    const deploymentTx = await this.getDeployTransaction();
    if (typeof deploymentTx.data !== 'string')
      throw Error('unsigned tx data as bytes not supported');
    return getAddress(
      '0x' +
        solidityKeccak256(
          ['bytes'],
          [
            `0xff${create2DeployerAddress.slice(2)}${salt.slice(
              2
            )}${solidityKeccak256(['bytes'], [deploymentTx.data]).slice(2)}`,
          ]
        ).slice(-40)
    );
  }

  private async calculateZkCreate2Address(
    create2DeployerAddress: Address,
    salt: string
  ): Promise<Address> {
    const bytecodeHash = zk.utils.hashBytecode(this.artifact.bytecode);
    const constructor = this.factory.interface.encodeDeploy(this.args);
    return zk.utils.create2Address(
      create2DeployerAddress,
      bytecodeHash,
      salt,
      constructor
    );
  }

  public async getCreate2Address(
    create2DeployerAddress: Address,
    create2Salt: string
  ): Promise<Address> {
    if (this.isZkSync)
      return await this.calculateZkCreate2Address(
        create2DeployerAddress,
        create2Salt
      );
    return await this.calculateEvmCreate2Address(
      create2DeployerAddress,
      create2Salt
    );
  }

  public async compareDeploymentTransaction(
    transaction: TransactionResponse
  ): Promise<boolean> {
    const newTransaction = await this.getDeployTransaction();
    const newData = newTransaction.data?.toString();
    if (this.isZkSync) {
      const deserialize = zk.utils.parseTransaction(transaction.data) as any;
      const desFlattened = hexConcat(deserialize.customData.factoryDeps);
      const factoryDeps = await this.extractFactoryDeps(this.artifact);
      const newFlattened = hexConcat(factoryDeps);

      return deserialize.data !== newData || desFlattened != newFlattened;
    } else {
      return transaction.data !== newData;
    }
  }
}
