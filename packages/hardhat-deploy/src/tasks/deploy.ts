import {NewTaskActionFunction} from 'hardhat/types/tasks';
import {loadAndExecuteDeploymentsFromFiles} from '@rocketh/node';
import {generateForkConfig} from '../helpers.js';
import {setupLogger} from 'named-logs-console';
import {HardhatPluginError} from 'hardhat/plugins';

interface RunActionArguments {
	skipPrompts: boolean;
	saveDeployments?: string;
	tags?: string;
	pollingInterval?: string;
	reportGasUsed: boolean;
}

const runScriptWithHardhat: NewTaskActionFunction<RunActionArguments> = async (args, hre) => {
	let saveDeployments = true;
	let skipPrompts = args.skipPrompts ? true : false;

	const {connection, environment, isFork, provider} = await generateForkConfig({hre});

	const isMemoryNetwork = connection.networkConfig.type == 'edr-simulated';
	if (isMemoryNetwork) {
		skipPrompts = true;
		saveDeployments = false;
	}
	if (args.saveDeployments) {
		saveDeployments = args.saveDeployments == 'true' ? true : false;
	}
	const tags = args.tags && args.tags != '' ? args.tags : undefined;

	setupLogger(['rocketh', '@rocketh/node'], {
		enabled: true,
		level: 3,
	});

	const defaultPollingInterval = args.pollingInterval ? parseInt(args.pollingInterval) : undefined;

	if (defaultPollingInterval !== undefined && isNaN(defaultPollingInterval)) {
		throw new HardhatPluginError('hardhat-deploy', `invalid pollingInterval value : ${args.pollingInterval}`);
	}

	await loadAndExecuteDeploymentsFromFiles({
		provider,
		environment: environment,
		saveDeployments: isFork ? false : saveDeployments,
		askBeforeProceeding: skipPrompts ? false : true,
		tags: tags?.split(','),
		defaultPollingInterval,
		reportGasUse: args.reportGasUsed,
		extra: {connection},
	});
};
export default runScriptWithHardhat;
