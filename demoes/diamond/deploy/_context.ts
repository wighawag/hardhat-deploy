/// Typed Context
/// This file is used by deploy script to get access
/// to typed artifacts as well as account names

import artifacts from '../generated/artifacts.js';

// we also add here the module we need
import '@rocketh/deploy'; // this one provide a deploy function
import '@rocketh/read-execute'; // this one provide read,execute functions
import '@rocketh/diamond'; // this one add a diamond function to declaratively deploy EIP-2535 contract

export const context = {
	// this define the named-accounts
	// these are transformed into addresses
	// so when your deploy function get executed it have access to them while keeping type-safety
	accounts: {
		deployer: {
			default: 0,
		},
	},
	// the artifacts are viem compatible and you can use them to have type-safe calls or deployments
	artifacts,
} as const;
