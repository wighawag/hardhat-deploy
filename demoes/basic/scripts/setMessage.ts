import {context} from '../deploy/_context.js';
import hre from 'hardhat';
import {loadEnvironmentFromHardhat} from 'hardhat-deploy/helpers';

async function main() {
	const env = await loadEnvironmentFromHardhat({hre, context});
	const GreetingsRegistry = env.get<typeof context.artifacts.GreetingsRegistry.abi>('GreetingsRegistry');

	const before_messages = await env.read(GreetingsRegistry, {
		functionName: 'messages',
		args: [env.namedAccounts.deployer],
	});

	console.log(before_messages);

	await env.execute(GreetingsRegistry, {
		account: env.namedAccounts.deployer,
		functionName: 'setMessage',
		args: ['hello'],
	});

	const after_messages = await env.read(GreetingsRegistry, {
		functionName: 'messages',
		args: [env.namedAccounts.deployer],
	});
	console.log(after_messages);
}
main();
