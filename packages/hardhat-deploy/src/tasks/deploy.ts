import {NewTaskActionFunction} from 'hardhat/types/tasks';
import {ConfigOptions, loadAndExecuteDeployments} from 'rocketh';

interface RunActionArguments {
	saveDeployments: string;
	skipPrompts: boolean;
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
	await loadAndExecuteDeployments({
		logLevel: 1,
		provider: connection.provider as unknown as any, // TODO type
		network: process.env.HARDHAT_FORK ? {fork: process.env.HARDHAT_FORK} : connection.networkName,
		saveDeployments,
		askBeforeProceeding: skipPrompts ? false : true,
		// reportGasUse: args.skipGasReport ? false : true,
	});
};
export default runScriptWithHardhat;
