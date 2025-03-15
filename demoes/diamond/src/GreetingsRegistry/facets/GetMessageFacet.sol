// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./GreetingsRegistryBaseFacet.sol";

contract GetMessageFacet is GreetingsRegistryBaseFacet {
    constructor(Config memory config) GreetingsRegistryBaseFacet(config) {}

    function messages(address user) external view returns (string memory) {
        return _messages[user];
    }
}
