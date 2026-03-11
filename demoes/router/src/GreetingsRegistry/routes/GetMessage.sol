// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UsingGreetingsRegistryInternal.sol";

contract GetMessage is UsingGreetingsRegistryInternal {
    constructor(Config memory config) UsingGreetingsRegistryInternal(config) {}

    function messages(address user) external view returns (string memory) {
        return _messages[user];
    }
}
