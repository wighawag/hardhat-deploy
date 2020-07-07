pragma solidity ^0.6.4;

import "./DiamondOwnershipEvents.sol";

interface DiamondOwnership is DiamondOwnershipEvents {
    function transferOwnership(address newOwner) external;
}
