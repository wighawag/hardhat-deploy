// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/// @title Greetings Registry
/// @notice let user set a greeting 1
contract UUPSImplementation1 is UUPSUpgradeable {
    /// @notice emitted whenever a user update its greeting
    /// @param user the account whose greeting was updated
    /// @param message the new greeting
    event MessageChanged(address indexed user, string message);

    string internal _prefix;
    address internal _owner;

    /// @notice the greeting for each account
    mapping(address => string) public messages;

    constructor(address initialOwner, string memory prefix) {
        _owner = initialOwner;
        _prefix = prefix;
    }

    function init(
        address initialOwner,
        string memory prefix
    ) external onlyProxy {
        _owner = initialOwner;
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

    function _authorizeUpgrade(address) internal view override {
        if (msg.sender != _owner) {
            revert("NOT_AUTHORIZED");
        }
    }

    function owner() external view returns (address) {
        return _owner;
    }
}
