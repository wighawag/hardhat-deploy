/* eslint-disable @typescript-eslint/no-explicit-any */
import {Deployment, FixtureFunc, DeploymentSubmission, LinkReferences, Artifact} from 'hardhat/types';

export type ExtendedArtifact = {
  abi: any[];
  bytecode: string; // "0x"-prefixed hex string
  deployedBytecode?: string; // "0x"-prefixed hex string
  metadata?: string;
  linkReferences?: LinkReferences;
  deployedLinkReferences?: LinkReferences;
  solcInput?: string;
  solcInputHash?: string;
  userdoc?: any;
  devdoc?: any;
  methodIdentifiers?: any;
  storageLayout?: any;
  evm?: any;
};

export interface PartialExtension {
  save(name: string, deployment: DeploymentSubmission): Promise<void>;
  get(name: string): Promise<Deployment>;
  getOrNull(name: string): Promise<Deployment | null>;
  getDeploymentsFromAddress(address: string): Promise<Deployment[]>;
  all(): Promise<{[name: string]: Deployment}>;
  getExtendedArtifact(name: string): Promise<ExtendedArtifact>;
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
  ): Promise<{[name: string]: Deployment}>;
  fixture(tags?: string | string[]): Promise<{[name: string]: Deployment}>;
  createFixture(func: FixtureFunc, id?: string): () => Promise<any>; // TODO Type Parameter
  log(...args: any[]): void;
}
