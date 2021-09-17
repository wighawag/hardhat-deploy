import { HardhatRuntimeEnvironment } from 'hardhat/types';
export declare function submitSources(hre: HardhatRuntimeEnvironment, solcInputsPath: string, config?: {
    etherscanApiKey?: string;
    license?: string;
    fallbackOnSolcInput?: boolean;
    forceLicense?: boolean;
    sleepBetween?: boolean;
}): Promise<void>;
//# sourceMappingURL=etherscan.d.ts.map