import {assert} from 'chai';

import {useEnvironment} from './helpers';

describe('Integration tests examples', function () {
  describe('Hardhat Runtime Environment extension', function () {
    useEnvironment('hardhat-project', 'hardhat');

    it('It should add the example field', function () {
      assert.isNotNull(this.env.deployments);
    });

    it('The example filed should say hello', async function () {
      assert.equal(await this.env.getChainId(), '31337');
    });
  });
});
