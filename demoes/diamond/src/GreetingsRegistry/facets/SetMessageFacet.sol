// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./GreetingsRegistryBaseFacet.sol";

contract SetMessageFacet is GreetingsRegistryBaseFacet {
    constructor(Config memory config) GreetingsRegistryBaseFacet(config) {}

    /// @notice called to set your own greeting
    /// @param message the new greeting
    function setMessage(string calldata message) external {
        string memory actualMessage = string(
            abi.encodePacked(_prefix, message)
        );
        _messages[msg.sender] = actualMessage;
        emit MessageChanged(msg.sender, actualMessage);
    }
}
