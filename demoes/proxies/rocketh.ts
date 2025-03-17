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
// We also added an alias (@rocketh) in tsconfig.json
// so they just need to do `import {execute, artifacts} from '@rocketh';`
// and this work anywhere in the file hierarchy
// ------------------------------------------------------------------------------------------------
// we add here the module we need, so that they are available in the deploy scripts
import '@rocketh/deploy'; // this one provide a deploy function
import '@rocketh/read-execute'; // this one provide read,execute functions
import '@rocketh/proxy'; // this one provide a deployViaProxy function that let you declaratively deploy proxy based contracts
// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import artifacts from './generated/artifacts.js';
export {artifacts};
// ------------------------------------------------------------------------------------------------
// while not necessary, we also converted the execution function type to know about the named accounts
// this way you get type safe accounts
import {execute as _execute, loadAndExecuteDeployments, type NamedAccountExecuteFunction} from 'rocketh';
const execute = _execute as NamedAccountExecuteFunction<typeof config.accounts>;
export {execute, loadAndExecuteDeployments};
