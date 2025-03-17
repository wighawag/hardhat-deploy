// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/// @title Greetings Registry
/// @notice let user set a greeting 1
contract UUPSImplementation2 is UUPSUpgradeable {
    /// @notice emitted whemever a user update its greeting
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
        string memory actualMessage = string(abi.encodePacked(_prefix, message));
        messages[msg.sender] = actualMessage;
        emit MessageChanged(msg.sender, actualMessage);
    }

    function getMessage(address user) external view returns (string memory) {
        return messages[user];
    }

    function _authorizeUpgrade(address) internal view override {
        revert("NOT_AUTHORIZED");
    }
}
