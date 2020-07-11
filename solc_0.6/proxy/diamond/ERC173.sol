pragma solidity ^0.6.4;

import "./ERC173Events.sol";

interface ERC173 is ERC173Events {
    function transferOwnership(address newOwner) external;

    function owner() external view returns (address);
}
