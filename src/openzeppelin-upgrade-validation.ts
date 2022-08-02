import {promises as fs} from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';

import type {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  getUnlinkedBytecode,
  getVersion,
  withValidationDefaults,
  ValidationDataCurrent,
  ValidationRunData,
  concatRunData,
  isCurrentValidationData,
  getStorageLayout,
  StorageLayout,
} from '@openzeppelin/upgrades-core';
import type {SolcOutput} from '@openzeppelin/upgrades-core';

type RecursivePartial<T> = {[k in keyof T]?: RecursivePartial<T[k]>};

type MaybeSolcOutput = RecursivePartial<SolcOutput>;

export function isFullSolcOutput(output: MaybeSolcOutput | undefined): boolean {
  if (output?.contracts == undefined || output?.sources == undefined) {
    return false;
  }

  for (const file of Object.values(output.contracts)) {
    if (file == undefined) {
      return false;
    }
    for (const contract of Object.values(file)) {
      if (contract?.evm?.bytecode == undefined) {
        return false;
      }
    }
  }

  for (const file of Object.values(output.sources)) {
    if (file?.ast == undefined || file?.id == undefined) {
      return false;
    }
  }

  return true;
}

async function lock(file: string) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  return lockfile.lock(file, {
    retries: {minTimeout: 50, factor: 1.3},
    realpath: false,
  });
}

export async function writeValidations(
  hre: HardhatRuntimeEnvironment,
  newRunData: ValidationRunData
): Promise<void> {
  const cachePath = getValidationsCachePath(hre);
  let releaseLock;
  try {
    releaseLock = await lock(cachePath);
    const storedData = await readValidations(hre, false).catch((e) => {
      // If there is no previous data to append to, we ignore the error and write
      // the file from scratch.
      if (e instanceof ValidationsCacheNotFound) {
        return undefined;
      } else {
        throw e;
      }
    });
    const validations = concatRunData(newRunData, storedData);
    await fs.writeFile(cachePath, JSON.stringify(validations, null, 2));
  } finally {
    await releaseLock?.();
  }
}

export async function readValidations(
  hre: HardhatRuntimeEnvironment,
  acquireLock = true
): Promise<ValidationDataCurrent> {
  const cachePath = getValidationsCachePath(hre);
  let releaseLock;
  try {
    if (acquireLock) {
      releaseLock = await lock(cachePath);
    }
    const data = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    if (!isCurrentValidationData(data)) {
      await fs.unlink(cachePath);
      throw new ValidationsCacheOutdated();
    }
    return data;
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new ValidationsCacheNotFound();
    } else {
      throw e;
    }
  } finally {
    await releaseLock?.();
  }
}

export class ValidationsCacheNotFound extends Error {
  constructor() {
    super(
      'Validations cache not found. Recompile with `hardhat compile --force`'
    );
  }
}

export class ValidationsCacheOutdated extends Error {
  constructor() {
    super(
      'Validations cache is outdated. Recompile with `hardhat compile --force`'
    );
  }
}

function getValidationsCachePath(hre: HardhatRuntimeEnvironment): string {
  return path.join(hre.config.paths.cache, 'validations.json');
}

// Checks the contract is a valid implementation (e.g. no `constructor` etc.)
export const openzeppelin_assertIsValidImplementation = async (implementation: {
  bytecode?: string;
}): Promise<undefined> => {
  const requiredOpts = withValidationDefaults({});
  const {version, validations} = await getVersionAndValidations(implementation);

  // This will throw an error if the implementation is invalid.
  assertUpgradeSafe(validations, version, requiredOpts);

  return;
};

// Checks the old implementation against the new implementation and
// ensures that it's valid.
export const openzeppelin_assertIsValidUpgrade = async (
  oldStorageLayout: StorageLayout,
  newImplementation: {bytecode?: string}
): Promise<undefined> => {
  const {version: newVersion, validations} = await getVersionAndValidations(
    newImplementation
  );

  const newStorageLayout = getStorageLayout(validations, newVersion);

  // This will throw an error if the upgrade is invalid.
  assertStorageUpgradeSafe(
    oldStorageLayout,
    newStorageLayout,
    withValidationDefaults({})
  );

  return;
};

const getVersionAndValidations = async (implementation: {
  bytecode?: string;
}) => {
  if (implementation.bytecode === undefined)
    throw Error('No bytecode for implementation');

  // @ts-expect-error `hre` is actually defined globally
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(
    validations,
    implementation.bytecode
  );
  const version = getVersion(unlinkedBytecode, implementation.bytecode);

  return {
    version,
    validations,
  };
};
