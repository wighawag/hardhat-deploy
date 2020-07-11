pragma solidity ^0.6.4;

import "./DiamondStorageContract.sol";
import "./ERC173.sol";

contract OwnershipFacet is ERC173, DiamondStorageContract {
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
