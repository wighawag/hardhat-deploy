// We load the plugin here.
import '../../../src/index';

import {HardhatUserConfig} from 'hardhat/types';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.7.3',
  },
  defaultNetwork: 'hardhat',
};

export default config;
