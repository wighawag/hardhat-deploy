pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "./DiamondStorageContract.sol";
import "./DiamondOwnership.sol";

contract DiamondOwnershipFacet is DiamondOwnership, DiamondStorageContract {
    function transferOwnership(address newOwner) external override {
        DiamondStorage storage ds = diamondStorage();
        address currentOwner = ds.contractOwner;
        require(msg.sender == currentOwner, "Must own the contract.");
        ds.contractOwner = newOwner;
        emit OwnershipTransferred(currentOwner, newOwner);
    }
}
