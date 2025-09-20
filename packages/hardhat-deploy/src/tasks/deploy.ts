import {NewTaskActionFunction} from 'hardhat/types/tasks';
import {loadAndExecuteDeployments} from 'rocketh';
import {generateForkConfig} from '../helpers.js';

interface RunActionArguments {
	saveDeployments: string;
	skipPrompts: boolean;
	tags?: string;
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
	if (args.saveDeployments != '') {
		saveDeployments = args.saveDeployments == 'true' ? true : false;
	}
	const tags = args.tags && args.tags != '' ? args.tags : undefined;

	await loadAndExecuteDeployments({
		logLevel: 1,
		provider,
		environment: environment,
		saveDeployments: isFork ? false : saveDeployments,
		askBeforeProceeding: skipPrompts ? false : true,
		tags: tags?.split(','),
		// reportGasUse: args.skipGasReport ? false : true,
		extra: {connection},
	});
};
export default runScriptWithHardhat;
