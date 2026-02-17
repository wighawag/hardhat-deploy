// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Greetings Registry
/// @notice let user set a greeting 1
contract GreetingsRegistry {
    /// @notice emitted whenever a user update its greeting
    /// @param user the account whose greeting was updated
    /// @param message the new greeting
    event MessageChanged(address indexed user, string message);

    string internal _prefix;

    /// @notice the greeting for each account
    mapping(address => string) public messages;

    constructor(string memory prefix) {
        _prefix = prefix;
    }

    /// @notice called to set your own greeting
    /// @param message the new greeting
    function setMessage(string calldata message) external {
        string memory actualMessage = string(
            abi.encodePacked(_prefix, message)
        );
        messages[msg.sender] = actualMessage;
        emit MessageChanged(msg.sender, actualMessage);
    }
}
