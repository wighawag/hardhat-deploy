import {Web3Provider} from '@ethersproject/providers';
import {readValidations} from '@openzeppelin/hardhat-upgrades/dist/utils/validations';
import {
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  getImplementationAddress,
  getStorageLayout,
  getStorageLayoutForAddress,
  getUnlinkedBytecode,
  getVersion,
  Manifest,
  ProxyDeployment,
  ValidationData,
  Version,
  withValidationDefaults,
} from '@openzeppelin/upgrades-core';
import {Address, Deployment} from '../types';

export const openzeppelin_assertIsValidUpgrade = async (
  provider: Web3Provider,
  proxyAddress: Address,
  newImplementation: {bytecode?: string}
): Promise<undefined> => {
  if (newImplementation.bytecode === undefined)
    throw Error('No bytecode for implementation');

  const manifest = await Manifest.forNetwork(provider);

  // @ts-expect-error `hre` is actually defined globally
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(
    validations,
    newImplementation.bytecode
  );
  const newVersion = getVersion(unlinkedBytecode, newImplementation.bytecode);

  const newStorageLayout = getStorageLayout(validations, newVersion);
  const oldStorageLayout = await getStorageLayoutForAddress(
    manifest,
    validations,
    await getImplementationAddress(provider, proxyAddress)
  );

  // This will throw an error if the upgrade is invalid.
  assertStorageUpgradeSafe(
    oldStorageLayout,
    newStorageLayout,
    withValidationDefaults({})
  );

  return;
};

export const openzeppelin_assertIsValidImplementation = async (implementation: {
  bytecode?: string;
}): Promise<undefined> => {
  if (implementation.bytecode === undefined)
    throw Error('No bytecode for implementation');

  const requiredOpts = withValidationDefaults({});
  // @ts-expect-error `hre` is actually defined globally
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(
    validations,
    implementation.bytecode
  );
  const version = getVersion(unlinkedBytecode, implementation.bytecode);

  // This will throw an error if the implementation is invalid.
  assertUpgradeSafe(validations, version, requiredOpts);

  return;
};

export const openzeppelin_saveDeploymentManifest = async (
  provider: Web3Provider,
  proxy: Deployment,
  implementation: Deployment
): Promise<undefined> => {
  if (implementation.bytecode === undefined)
    throw Error('No bytecode for implementation');

  const manifest = await Manifest.forNetwork(provider);
  await manifest.addProxy({
    address: proxy.address,
    txHash: proxy.transactionHash,
    kind: 'transparent',
  });

  // @ts-expect-error `hre` is actually defined globally
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(
    validations,
    implementation.bytecode
  );
  const version = getVersion(unlinkedBytecode, implementation.bytecode);

  await manifest.lockedRun(async () => {
    const manifestData = await manifest.read();
    const layout = getStorageLayout(validations, version);
    manifestData.impls[version.linkedWithoutMetadata] = {
      address: implementation.address,
      txHash: implementation.transactionHash,
      layout,
    };

    await manifest.write(manifestData);
  });

  return;
};
