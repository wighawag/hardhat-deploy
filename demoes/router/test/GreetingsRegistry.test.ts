import {expect} from 'earl';
import {describe, it} from 'node:test'; // using node:test as hardhat v3 do not support vitest
import {network} from 'hardhat';
import {setupFixtures} from './utils/index.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('GreetingsRegistry', function () {
	it('basic test', async function () {
		const {env, GreetingsRegistryRead, GreetingsRegistryWrite, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);
		const greetingToSet = 'hello world';
		const greeter = unnamedAccounts[0];
		await expect(
			await env.read(GreetingsRegistryRead, {
				functionName: 'messages',
				args: [greeter],
			}),
		).toEqual('');

		await env.execute(GreetingsRegistryWrite, {functionName: 'setMessage', args: [greetingToSet], account: greeter});

		await expect(
			await env.read(GreetingsRegistryRead, {
				functionName: 'messages',
				args: [greeter],
			}),
		).toEqual(greetingToSet);
	});

	it('basic test 2', async function () {
		const {env, GreetingsRegistryRead, GreetingsRegistryWrite, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);
		const greetingToSet = 'hello world';
		const greeter = unnamedAccounts[0];
		await expect(
			await env.read(GreetingsRegistryRead, {
				functionName: 'messages',
				args: [greeter],
			}),
		).toEqual('');

		await env.execute(GreetingsRegistryWrite, {functionName: 'setMessage', args: [greetingToSet], account: greeter});

		await expect(
			await env.read(GreetingsRegistryRead, {
				functionName: 'messages',
				args: [greeter],
			}),
		).toEqual(greetingToSet);
	});
});
