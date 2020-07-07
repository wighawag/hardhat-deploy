pragma solidity ^0.6.4;

interface DiamondOwnershipEvents {
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
}
