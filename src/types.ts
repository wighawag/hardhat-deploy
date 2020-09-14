import {
  Deployment,
  FixtureFunc,
  DeploymentSubmission,
  Artifact,
  ABI
} from "@nomiclabs/buidler/types";

export interface PartialExtension {
  save(name: string, deployment: DeploymentSubmission): Promise<void>;
  get(name: string): Promise<Deployment>;
  getOrNull(name: string): Promise<Deployment | null>;
  // TODO getABIFromAddress(address: string): Promise<ABI | null>;
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
}
