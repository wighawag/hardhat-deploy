"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const helpers_1 = require("./helpers");
describe('hardhat-deploy hre extension', function () {
    helpers_1.useEnvironment('hardhat-project', 'hardhat');
    it('It should add the deployments field', function () {
        chai_1.assert.isNotNull(this.env.deployments);
    });
    it('The getChainId should give the correct chainId', async function () {
        chai_1.assert.equal(await this.env.getChainId(), '31337');
    });
});
//# sourceMappingURL=project.test.js.map