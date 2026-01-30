# Environment object and extension

Each deploy function is given a environment object as first argument.

it contains at least the following fields :

```typescript
export interface Environment<
	NamedAccounts extends UnresolvedUnknownNamedAccounts = UnresolvedUnknownNamedAccounts,
	Data extends UnresolvedNetworkSpecificData = UnresolvedNetworkSpecificData,
	Deployments extends UnknownDeployments = UnknownDeployments,
	Extra extends Record<string, unknown> = Record<string, unknown>
> {
	readonly name: string;
	readonly context: {
		readonly saveDeployments: boolean;
	};
	readonly tags: {readonly [tag: string]: boolean};
	readonly network: {
		readonly chain: Chain;
		readonly provider: TransactionHashTracker;
		readonly fork?: boolean;
		readonly deterministicDeployment: DeterministicDeploymentInfo;
	};
	readonly deployments: Deployments;
	readonly namedAccounts: ResolvedNamedAccounts<NamedAccounts>;
	readonly data: ResolvedNetworkSpecificData<Data>;
	readonly namedSigners: ResolvedNamedSigners<ResolvedNamedAccounts<NamedAccounts>>;
	readonly unnamedAccounts: EIP1193Account[];
	// unnamedSigners: {type: 'remote'; signer: EIP1193ProviderWithoutEvents}[];
	readonly addressSigners: {[name: `0x${string}`]: Signer};
	save<TAbi extends Abi = Abi>(
		name: string,
		deployment: Deployment<TAbi>,
		options?: {doNotCountAsNewDeployment?: boolean}
	): Promise<Deployment<TAbi>>;
	savePendingDeployment<TAbi extends Abi = Abi>(pendingDeployment: PendingDeployment<TAbi>): Promise<Deployment<TAbi>>;
	savePendingExecution(pendingExecution: PendingExecution): Promise<EIP1193TransactionReceipt>;
	get<TAbi extends Abi>(name: string): Deployment<TAbi>;
	getOrNull<TAbi extends Abi>(name: string): Deployment<TAbi> | null;
	fromAddressToNamedABI<TAbi extends Abi>(address: Address): {mergedABI: TAbi; names: string[]};
	fromAddressToNamedABIOrNull<TAbi extends Abi>(address: Address): {mergedABI: TAbi; names: string[]} | null;
	showMessage(message: string): void;
	showProgress(message?: string): ProgressIndicator;

	hasMigrationBeenDone(id: string): boolean;
	readonly extra?: Extra;
}
```

The environment is expanded by each rocketh module you import. For example:

- **`@rocketh/deploy`** adds the `deploy` function
- **`@rocketh/read-execute`** adds `read`, `execute`, `readByName`, `executeByName`, and `tx` functions
- **`@rocketh/proxy`** adds the `deployViaProxy` function
- **`@rocketh/diamond`** adds the `diamond` function
- **`@rocketh/viem`** adds the `viem` property with `getContract`, `getWritableContract`, `publicClient`, and `walletClient`