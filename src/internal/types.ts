import {Artifact} from 'hardhat/types';

import {
  Deployment,
  FixtureFunc,
  DeploymentSubmission,
  ExtendedArtifact,
} from '../../types';

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
  createFixture<T>(func: FixtureFunc<T>, id?: string): () => Promise<T>;
  log(...args: unknown[]): void;
}
