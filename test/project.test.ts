import {assert} from 'chai';

import {useEnvironment} from './helpers';

describe('hardhat-deploy hre extension', function () {
  useEnvironment('hardhat-project', 'hardhat');
  it('It should add the deployments field', function () {
    assert.isNotNull(this.env.deployments);
  });

  it('The getChainId should give the correct chainId', async function () {
    assert.equal(await this.env.getChainId(), '31337');
  });
});
