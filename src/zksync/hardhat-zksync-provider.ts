import { ethers } from 'ethers';
import { Provider } from 'zksync-ethers';
import { Network } from 'hardhat/types';
import { ConnectionInfo } from 'ethers/lib/utils';
import { HardhatZksyncSigner } from './hardhat-zksync-signer';

export class HardhatZksyncProvider extends Provider {
    constructor(
        public readonly hardhatNetwork: Network,
        url?: ConnectionInfo | string,
        network?: ethers.providers.Networkish,
    ) {
        super(url, network);
    }

    public getSigner(address?: string | number | undefined): HardhatZksyncSigner {
        return HardhatZksyncSigner.from(super.getSigner(address) as any, this);
    }
}