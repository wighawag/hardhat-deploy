// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../utils/ShortStrings.sol";

contract GreetingsRegistryBaseFacet {
    /// @notice emitted whemever a user update its greeting
    /// @param user the account whose greeting was updated
    /// @param message the new greeting
    event MessageChanged(address indexed user, string message);

    uint256 internal immutable _num;
    ShortString internal _prefix;

    /// @notice the greeting for each account
    mapping(address => string) internal _messages;

    struct Config {
        uint256 num;
        string prefix;
    }

    constructor(Config memory config) {
        _num = config.num;
        _prefix = ShortStrings.toShortString(config.prefix);
    }
}
