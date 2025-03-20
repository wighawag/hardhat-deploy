import {HardhatUserConfig, configVariable} from 'hardhat/config';

import HardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner';
import HardhatViem from '@nomicfoundation/hardhat-viem';
import HardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';
import HardhatKeystore from '@nomicfoundation/hardhat-keystore';

import HardhatDeploy from 'hardhat-deploy';
import {addForkConfiguration, addNetworksFromEnv} from 'hardhat-deploy/helpers';

const config: HardhatUserConfig = {
	plugins: [HardhatNodeTestRunner, HardhatViem, HardhatNetworkHelpers, HardhatKeystore, HardhatDeploy],
	solidity: {
		profiles: {
			default: {
				version: '0.8.28',
			},
			production: {
				version: '0.8.28',
				settings: {
					optimizer: {
						enabled: true,
						runs: 999999,
					},
				},
			},
		},

		remappings: [
			/*
			 * This remapping is added to the example because most people import
			 * forge-std/Test.sol, not forge-std/src/Test.sol.
			 *
			 * Note: The config currently leaks internal IDs, but this will be fixed
			 * in the future.
			 */
			'forge-std/=npm/forge-std@1.9.4/src/',
		],
	},
	networks: addForkConfiguration(
		// this add network for each respective env var found (ETH_NODE_URI_<network>)
		// it will also read MNEMONIC_<network> to populate the accounts
		// Note that if you set these env to be "SECRET" it will be like using:
		//  configVariable('ETH_NODE_URI_<network>')
		//  configVariable('MNEMONIC_<network>')
		addNetworksFromEnv({
			hardhatMainnet: {
				type: 'edr',
				chainType: 'l1',
			},
			hardhatOp: {
				type: 'edr',
				chainType: 'optimism',
			},
		}),
	),
	paths: {
		sources: ['src'],
	},
};

export default config;
