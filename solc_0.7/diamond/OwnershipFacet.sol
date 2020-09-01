// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "./DiamondStorageContract.sol";
import "./DiamondHeaders.sol";

contract OwnershipFacet is IERC173, DiamondStorageContract {
    function transferOwnership(address newOwner) external override {
        DiamondStorage storage ds = diamondStorage();
        address currentOwner = ds.contractOwner;
        require(msg.sender == currentOwner, "Must own the contract.");
        ds.contractOwner = newOwner;
        emit OwnershipTransferred(currentOwner, newOwner);
    }

    function owner() external override view returns (address) {
        DiamondStorage storage ds = diamondStorage();
        return ds.contractOwner;
    }
}
