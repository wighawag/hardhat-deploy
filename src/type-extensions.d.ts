import "@nomiclabs/buidler/types";
import { Artifact } from "@nomiclabs/buidler/types";

declare module "@nomiclabs/buidler/types" {
  
  export interface BuidlerRuntimeEnvironment {
    deployments: DeploymentsExtension;
    namedAccounts: { [name: string]: Address; }; // TODO Address type ?
    ethers: {getContract(contractName: string, signer?: any): Promise<any>} // TODO as ethers type
  }

  export interface BuidlerNetworkConfig {
    live?: boolean;
  }

  export interface HttpNetworkConfig {
    live?: boolean;
  }

  export interface DeployFunction {
    (env: BuidlerRuntimeEnvironment): Promise<void>;
    skip?: (env: BuidlerRuntimeEnvironment) => Promise<boolean>;
    tags?: string[];
    dependencies?: string[];
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

  export interface DeploymentsExtension {
    save(name: string, deployment: Deployment): void;
    get(name: string): Deployment;
    all(): { [name: string]: Deployment };
    getArtifact(): Artifact;
    run(
      tags?: string | string[],
      options?:{ reset: boolean }
    ): Promise<{ [name: string]: Deployment }>;
    log(...args: any[]): void;
    chainId?: string;
    deploy(name: string, options: DeployTxOptions, contractName: string, ...args: any[]): Promise<DeployResult>;
    deployIfDifferent(fieldsToCompare: string[], name: string, options: DeployTxOptions, contractName: string, ...args: any[]): Promise<DeployResult>;
    sendTxAndWait(options: TxOptions, contractName: string, methodName: string, ...args: any[]) : Promise<Receipt>;
    sendTxAndWait(contractName: string, methodName: string, ...args: any[]) : Promise<Receipt>;
    call(options: TxOptions, contractName: string, methodName: string, ...args: any[]) : Promise<any>;
    call(contractName: string, methodName: string, ...args: any[]) : Promise<any>;
    rawCall(to: Address, data: string): Promise<any>;
    batchTxAndWait(txs: any[][], batchOptions: {dev_forceMine: boolean}): void; // TODO use TxObject instead of arrays
  }

  // export interface ResolvedBuidlerConfig {
    
  // }
  export interface BuidlerConfig {
    namedAccounts?: {[name: string]: any};
  }

  export interface ProjectPaths {
    deploy?: string;
    deployments?: string;
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
