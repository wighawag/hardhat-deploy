// ------------------------------------------------------------------------------------------------
// Typed Config
// ------------------------------------------------------------------------------------------------
import type {UserConfig} from 'rocketh';
export const config = {
	accounts: {
		deployer: {
			default: 0,
		},
	},
} as const satisfies UserConfig;

// ------------------------------------------------------------------------------------------------
// Imports and Re-exports
// ------------------------------------------------------------------------------------------------
// We regroup all what is needed for the deploy scripts
// so that they just need to import this file

// we add here the extension we need, so that they are available in the deploy scripts
// extensions are simply function that accept as their first argument the Environment
// by passing them to the setup function (see below) you get to access them through the environment object with type-safety
import * as deployExtensions from '@rocketh/deploy'; // this one provide a deploy function
import * as readExecuteExtensions from '@rocketh/read-execute'; // this one provide read,execute extensions
const extensions = {...deployExtensions, ...readExecuteExtensions};
// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import * as artifacts from './generated/artifacts/index.js';
export {artifacts};
// ------------------------------------------------------------------------------------------------
// we create the rocketh function we need by passing the extensions
import {setup} from 'rocketh';
const {deployScript, loadAndExecuteDeployments} = setup<typeof extensions, typeof config.accounts>(extensions);
// ------------------------------------------------------------------------------------------------
// we do the same for hardhat-deploy
import {setupHardhatDeploy} from 'hardhat-deploy/helpers';
const {loadEnvironmentFromHardhat} = setupHardhatDeploy(extensions);
// ------------------------------------------------------------------------------------------------
// finally we export them
export {loadAndExecuteDeployments, deployScript, loadEnvironmentFromHardhat};
