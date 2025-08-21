// ------------------------------------------------------------------------------------------------
// Typed Config
// ------------------------------------------------------------------------------------------------
import {UserConfig} from 'rocketh';
export const config = {
	accounts: {
		deployer: {
			default: 0,
		},
		admin: {
			default: 1,
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
// by passing them to the setup function (see below) you get to access them trhough the environment object with type-safety
import * as deployFunctions from '@rocketh/deploy'; // this one provide a deploy function
import * as readExecuteFunctions from '@rocketh/read-execute'; // this one provide read,execute functions
import * as proxyFunctions from '@rocketh/proxy'; // this one provide functions to declare proxy deployments
const functions = {...deployFunctions, ...readExecuteFunctions, ...proxyFunctions};
// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import artifacts from './generated/artifacts.js';
export {artifacts};
// ------------------------------------------------------------------------------------------------
// we then create the deployScript function taht we use in our deploy script, you can call it whatever you want
import {setup, loadAndExecuteDeployments} from 'rocketh';
// the setup function can take functions, accounts and data and will ensure you have type-safety
const deployScript = setup<typeof functions, typeof config.accounts>(functions);
// we also export loadAndExecuteDeployments for tests
export {loadAndExecuteDeployments, deployScript};
