import {NewTaskActionFunction} from 'hardhat/types/tasks';
import {loadAndExecuteDeployments} from 'rocketh';

interface RunActionArguments {
	saveDeployments: string;
	skipPrompts: boolean;
	tags?: string;
}

const runScriptWithHardhat: NewTaskActionFunction<RunActionArguments> = async (args, hre) => {
	let saveDeployments = true;
	let skipPrompts = args.skipPrompts ? true : false;
	const connection = await hre.network.connect();
	const isMemoryNetwork = connection.networkConfig.type == 'edr';
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
		provider: connection.provider as unknown as any, // TODO type
		network: process.env.HARDHAT_FORK ? {fork: process.env.HARDHAT_FORK} : connection.networkName,
		saveDeployments,
		askBeforeProceeding: skipPrompts ? false : true,
		tags,
		// reportGasUse: args.skipGasReport ? false : true,
	});
};
export default runScriptWithHardhat;
