import {
  Deployment,
  FixtureFunc,
  DeploymentSubmission,
  Artifact,
} from "@nomiclabs/buidler/types";

export interface PartialExtension {
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
}
