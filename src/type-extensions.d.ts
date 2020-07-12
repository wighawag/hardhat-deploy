import "@nomiclabs/buidler/types";
import { boolean } from "@nomiclabs/buidler/internal/core/params/argumentTypes";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    deployments: DeploymentsExtension;
    getNamedAccounts: () => Promise<{ [name: string]: Address }>;
    getChainId(): Promise<string>;
  }

  export interface BuidlerNetworkConfig {
    live?: boolean;
    saveDeployments?: boolean;
  }

  export interface HttpNetworkConfig {
    live?: boolean;
    saveDeployments?: boolean;
  }

  export interface Network {
    live: boolean;
    saveDeployments: boolean;
  }

  export interface DeployFunction {
    (env: BuidlerRuntimeEnvironment): Promise<undefined | boolean>;
    skip?: (env: BuidlerRuntimeEnvironment) => Promise<boolean>;
    tags?: string[];
    dependencies?: string[];
    runAtTheEnd?: boolean;
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
  };

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
    events?: any[];
    logsBloom?: string;
    byzantium?: boolean;
    status?: number;
    confirmations?: number;
  };

  export type DiamondFacets = Array<string>; // TODO support Object for facet : {contract} // could be deploymentNames too ? or {abi,address}
  export interface DiamondOptions extends TxOptions {
    owner?: Address;
    facets: DiamondFacets;
    log?: boolean;
    libraries?: { [libraryName: string]: Address };
    linkedData?: any; // JSONable ?
    upgradeIndex?: number;
    execute?: {
      methodName: string;
      args: any[];
    };
  }

  export interface ProxyOptions {
    owner?: Address;
    upgradeIndex?: number;
    methodName?: string;
  }

  export interface DeployOptions extends TxOptions {
    contract?:
      | string
      | {
          abi: ABI;
          bytecode: string;
          deployedBytecode?: string;
        };
    args?: any[];
    fieldsToCompare?: string | string[];
    skipIfAlreadyDeployed?: boolean;
    log?: boolean;
    linkedData?: any; // JSONable ?
    libraries?: { [libraryName: string]: Address };
    proxy?: boolean | string | ProxyOptions; // TODO support different type of proxies ?
  }

  export interface CallOptions {
    from?: string;
    gasLimit?: string | number | BigNumber;
    gasPrice?: string | BigNumber;
    value?: string | BigNumber;
    nonce?: string | number | BigNumber;
    to?: string; // TODO make to and data part of a `SimpleCallOptions` interface
    data?: string;
  }

  export interface TxOptions extends CallOptions {
    from: string;
    dev_forceMine?: boolean;
    skipUnknownSigner?: boolean;
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

  export type Json =
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [prop: string]: Json };

  // from https://github.com/Microsoft/TypeScript/issues/1897#issuecomment-580962081
  type JsonCompatible<T> = {
    [P in keyof T]: T[P] extends Json
      ? T[P]
      : Pick<T, P> extends Required<Pick<T, P>>
      ? never
      : T[P] extends (() => any) | undefined
      ? never
      : JsonCompatible<T[P]>;
  };

  export type FixtureFunc = (
    env: BuidlerRuntimeEnvironment,
    options?: Json
  ) => Promise<any>;

  export interface DeploymentsExtension {
    deploy(name: string, options: DeployOptions): Promise<DeployResult>;
    diamond: {
      deploy(name: string, options: DiamondOptions): Promise<DeployResult>;
      executeAsOwner(
        name: string,
        options: TxOptions,
        methodName: string,
        ...args: any[]
      ): Promise<Receipt | null>;
    };
    fetchIfDifferent(name: string, options: DeployOptions): Promise<boolean>;
    save(name: string, deployment: DeploymentSubmission): Promise<void>;
    get(name: string): Promise<Deployment>;
    getOrNull(name: string): Promise<Deployment | null>;
    all(): Promise<{ [name: string]: Deployment }>;
    // getArtifactSync(name: string): Artifact; // TODO remove ?
    getArtifact(name: string): Promise<Artifact>;
    run(
      tags?: string | string[],
      options?: {
        resetMemory?: boolean;
        deletePreviousDeployments?: boolean;
        writeDeploymentsToFiles?: boolean;
        export?: string;
        exportAll?: string;
      }
    ): Promise<{ [name: string]: Deployment }>;
    fixture(tags?: string | string[]): Promise<{ [name: string]: Deployment }>;
    createFixture(func: FixtureFunc, id?: string): () => Promise<any>; // TODO Type Parameter
    log(...args: any[]): void;

    execute(
      name: string,
      options: TxOptions,
      methodName: string,
      ...args: any[]
    ): Promise<Receipt | null>;
    batchExecute(
      txs: Execute[],
      batchOptions: { dev_forceMine: boolean }
    ): Promise<(Receipt | null)[]>;
    rawTx(tx: SimpleTx): Promise<Receipt | null>;
    read(
      name: string,
      options: CallOptions,
      methodName: string,
      ...args: any[]
    ): Promise<any>;
    read(name: string, methodName: string, ...args: any[]): Promise<any>;
    // rawCall(to: Address, data: string): Promise<any>; // TODO ?
  }

  export interface BuidlerConfig {
    namedAccounts?: { [name: string]: any };
  }

  export interface ProjectPaths {
    deploy?: string;
    deployments?: string;
    imports?: string;
  }

  export interface ContractExport {
    address: string;
    abi: any[];
    linkedData?: any;
  }

  export interface Export {
    chainId: string;
    contracts: { [name: string]: ContractExport };
  }

  export type MultiExport = {
    [chainId: string]: { [networkName: string]: Export };
  };

  export interface DeploymentSubmission {
    abi: ABI;
    receipt: Receipt;
    address?: Address; // used to override receipt.contractAddress (useful for proxies)
    history?: Deployment[];
    args?: any[];
    linkedData?: any;
    solidityJson?: any; // TODO solidityJson type
    solidityMetadata?: string;
    bytecode?: string;
    deployedBytecode?: string;
    userdoc?: any;
    devdoc?: any;
    methodIdentifiers?: any;
    diamondCuts?: string[];
    facets?: { address: string; sigs: string[] }[];
    execute?: {
      methodName: string;
      args: any[];
    };
  }

  export interface Deployment {
    abi: ABI;
    address: Address;
    receipt: Receipt;
    history?: Deployment[];
    args?: any[];
    linkedData?: any;
    solidityJson?: any; // TODO solidityJson type
    solidityMetadata?: string;
    bytecode?: string;
    deployedBytecode?: string;
    userdoc?: any;
    devdoc?: any;
    methodIdentifiers?: any;
    diamondCuts?: string[];
    facets?: { address: string; sigs: string[] }[];
  }
}
