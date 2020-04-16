import "@nomiclabs/buidler/types";

declare module "@nomiclabs/buidler/types" {
  
  export interface BuidlerRuntimeEnvironment {
    deployments: DeploymentsExtension;
    getNamedAccounts: () => Promise<{ [name: string]: Address; }>;
    getChainId(): Promise<string>;
  }

  export interface BuidlerNetworkConfig {
    live?: boolean;
  }

  export interface HttpNetworkConfig {
    live?: boolean;
  }

  export interface Network {
    live: boolean;
  }

  export interface DeployFunction {
    (env: BuidlerRuntimeEnvironment): Promise<void>;
    skip?: (env: BuidlerRuntimeEnvironment) => Promise<boolean>;
    tags?: string[];
    dependencies?: string[];
    runAtTheEnd?:boolean;
  }

  export type BigNumber = any; // TODO bignumber form ethers
  export type Address = string;

  export type ABI = any[]; // TODO abi

  export type Receipt = any; // TODO receipt

  export interface DeployTxOptions {
    from: Address;
    value?: number | string | BigNumber;
    gas?: number | string | BigNumber;
    gasPrice?: number | string | BigNumber;
  }

  export interface TxOptions {
    from: Address;
    value?: number | string | BigNumber;
    gas?: number | string | BigNumber;
    gasPrice?: number | string | BigNumber;
    data?: string;
  }

  export interface DeployedContract {
    address: Address;
    abi: ABI;
  }

  export interface DeployResult {
    contract: DeployedContract;
    transactionHash: string;
    receipt: Receipt;
    newlyDeployed: boolean;
  }

  export type FixtureFunc = (env: BuidlerRuntimeEnvironment) => Promise<any>;

  export interface DeploymentsExtension {
    save(name: string, deployment: Deployment): Promise<void>;
    get(name: string): Promise<Deployment>;
    getOrNull(name: string): Promise<Deployment | null>;
    all(): Promise<{ [name: string]: Deployment }>;
    getArtifactSync(): Artifact; // TODO remove ?
    getArtifact(): Promise<Artifact>;
    run(
      tags?: string | string[],
      options?:{ reset: boolean }
    ): Promise<{ [name: string]: Deployment }>;
    fixture(tags?: string | string[]): Promise<{ [name: string]: Deployment }>;
    createFixture(func: FixtureFunc, id?: string): () => Promise<any>; // TODO Type Parameter
    log(...args: any[]): void;
    deploy(name: string, options: DeployTxOptions, contractName: string, ...args: any[]): Promise<DeployResult>;
    deployIfDifferent(fieldsToCompare: string[], name: string, options: DeployTxOptions, contractName: string, ...args: any[]): Promise<DeployResult>;
    sendTxAndWait(options: TxOptions, contractName: string, methodName: string, ...args: any[]) : Promise<Receipt>;
    sendTxAndWait(contractName: string, methodName: string, ...args: any[]) : Promise<Receipt>;
    call(options: TxOptions, contractName: string, methodName: string, ...args: any[]) : Promise<any>;
    call(contractName: string, methodName: string, ...args: any[]) : Promise<any>;
    rawCall(to: Address, data: string): Promise<any>;
    batchTxAndWait(txs: any[][], batchOptions: {dev_forceMine: boolean}): Promise<any>; // TODO use TxObject instead of arrays
  }

  export interface BuidlerConfig {
    namedAccounts?: {[name: string]: any};
  }

  export interface ProjectPaths {
    deploy?: string;
    deployments?: string;
    imports?: string;
  }

  export interface Deployment {
    transactionHash?: string;
    args?: any[];
    abi?: ABI; // TODO ABI type
    address?: Address;
    linkedData?: any;
    solidityJson?: any; // TODO solidityJson
    solidityMetadata?: string;
  }
}
