// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGreetingsRegistry {
    function messages(address) external returns (string memory);
    function setMessage(string calldata message) external;
}
