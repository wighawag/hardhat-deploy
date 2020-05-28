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

  export type Log = {
    blockNumber: number;
    blockHash: string;
    transactionHash: string;
    transactionIndex: number;
    logIndex: number;
    removed: boolean;
    address: string;
    topics: string[];
    data: string;
  }

  export type Receipt = {
    to?: Address;
    from: Address;
    transactionHash: string;
    blockHash: string;
    blockNumber: number;
    transactionIndex: number;
    contractAddress?: string;
    cumulativeGasUsed: BigNumber | string | number;
    gasUsed: BigNumber | string | number;
    logs?: Log[];
    logsBloom?: string;
    byzantium?: boolean;
    status?: number;
    confirmations?: number;
  }

  export interface DeployOptions extends TxOptions {
    contractName?: string,
    args?: any[],
    fieldsToCompare?: string | string[],
    linkedData?: any; // JSONable ?
  }

  export interface CallOptions {
    from?: string;
    gasLimit?: string | number | BigNumber;
    gasPrice?: string | BigNumber;
    value?: string | BigNumber;
    nonce?: string | number | BigNumber;
    chainId?: string | number;
    to?: string; // TODO make to and data part of a `SimpleCallOptions` interface
    data?: string;
  }

  export interface TxOptions extends CallOptions {
    from: string;
    dev_forceMine?: boolean;
    skipError?: boolean;
    estimatedGasLimit?: string | number | BigNumber;
    estimateGasExtra?: string | number | BigNumber;
  }

  export interface Execute extends TxOptions {
    name: string;
    methodName: string;
    args?: any[];
  }

  export interface SimpleTx extends TxOptions {
    to: string;
  }

  export interface DeployedContract {
    address: Address;
    abi: ABI;
  }

  export interface DeployResult extends Deployment {
    newlyDeployed: boolean;
  }

  export type FixtureFunc = (env: BuidlerRuntimeEnvironment) => Promise<any>;

  export interface DeploymentsExtension {
    deploy(name: string, options: DeployOptions): Promise<DeployResult>;
    fetchIfDifferent(name: string, options: DeployOptions): Promise<boolean>;
    save(name: string, deployment: DeploymentSubmission): Promise<void>;
    get(name: string): Promise<Deployment>;
    getOrNull(name: string): Promise<Deployment | null>;
    all(): Promise<{ [name: string]: Deployment }>;
    // getArtifactSync(name: string): Artifact; // TODO remove ?
    getArtifact(name: string): Promise<Artifact>;
    run(
      tags?: string | string[],
      options?:{ reset: boolean }
    ): Promise<{ [name: string]: Deployment }>;
    fixture(tags?: string | string[]): Promise<{ [name: string]: Deployment }>;
    createFixture(func: FixtureFunc, id?: string): () => Promise<any>; // TODO Type Parameter
    log(...args: any[]): void;
    
    execute(name: string, options: TxOptions, methodName: string, ...args: any[]) : Promise<Receipt | null>;
    batchExecute(txs: Execute[], batchOptions: {dev_forceMine: boolean}): Promise<(Receipt | null)[]>;
    waitForRawTx(tx: SimpleTx) : Promise<Receipt | null>;
    call(name: string, options: CallOptions, methodName: string, ...args: any[]) : Promise<any>;
    call(name: string, methodName: string, ...args: any[]) : Promise<any>;
    // rawCall(to: Address, data: string): Promise<any>; // TODO ?
  }

  export interface BuidlerConfig {
    namedAccounts?: {[name: string]: any};
  }

  export interface ProjectPaths {
    deploy?: string;
    deployments?: string;
    imports?: string;
  }

  export interface ContractExport {
    address: string,
    abi: any[],
    linkedData?: any
  }

  export interface Export {
    chainId: string;
    contracts: { [name: string]: ContractExport }
  }

  export type MultiExport = { [chainId: string]: { [networkName: string]: Export } }

  export interface DeploymentSubmission {
    abi: ABI;
    receipt: Receipt;
    address?: Address; // used to override receipt.contractAddress (useful for proxies)
    args?: any[];
    linkedData?: any;
    solidityJson?: any; // TODO solidityJson type
    solidityMetadata?: string;
    bytecode?: string;
    deployedBytecode?: string;
    userdoc: any;
    devdoc: any;
    methodIdentifiers: any;
  }

  export interface Deployment {
    abi: ABI;
    address: Address;
    receipt: Receipt;
    args?: any[];
    linkedData?: any;
    solidityJson?: any; // TODO solidityJson type
    solidityMetadata?: string;
    bytecode?: string;
    deployedBytecode?: string;
    userdoc: any;
    devdoc: any;
    methodIdentifiers: any;
  }
}
