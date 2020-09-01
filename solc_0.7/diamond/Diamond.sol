// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
*
* Implementation of an example of a diamond.
/******************************************************************************/

import "./OwnershipFacet.sol";
import "./DiamondStorageContract.sol";
import "./DiamondHeaders.sol";
import "./DiamondFacet.sol";
import "./DiamondLoupeFacet.sol";

contract Diamond is IERC173Events, IERC165, DiamondStorageContract, DiamondFacet {

    constructor(address owner) payable {
        DiamondStorage storage ds = diamondStorage();
        ds.contractOwner = owner;
        emit OwnershipTransferred(address(0), owner);

        // Create a DiamondFacet contract which implements the Diamond interface
        DiamondFacet diamondFacet = new DiamondFacet();

        // Create a DiamondLoupeFacet contract which implements the Diamond Loupe interface
        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();

        // Create a OwnershipFacet contract which implements the ERC-173 Ownership interface
        OwnershipFacet ownershipFacet = new OwnershipFacet();

        bytes[] memory cut = new bytes[](4);

        // Adding cut function
        cut[0] = abi.encodePacked(
            diamondFacet,
            IDiamond.diamondCut.selector
        );

        // Adding diamond loupe functions
        cut[1] = abi.encodePacked(
            diamondLoupeFacet,
            IDiamondLoupe.facetFunctionSelectors.selector,
            IDiamondLoupe.facets.selector,
            IDiamondLoupe.facetAddress.selector,
            IDiamondLoupe.facetAddresses.selector
        );

        // Adding diamond ERC173 functions
        cut[2] = abi.encodePacked(
            ownershipFacet,
            IERC173.transferOwnership.selector,
            IERC173.owner.selector
        );

        // Adding supportsInterface function
        cut[3] = abi.encodePacked(address(this), IERC165.supportsInterface.selector);

         // execute non-standard internal diamondCut function to add functions
        diamondCut(cut);
        
        // adding ERC165 data
        // ERC165
        ds.supportedInterfaces[IERC165.supportsInterface.selector] = true;

        // DiamondCut
        ds.supportedInterfaces[IDiamond.diamondCut.selector] = true;

        // DiamondLoupe
        bytes4 interfaceID = IDiamondLoupe.facets.selector ^
            IDiamondLoupe.facetFunctionSelectors.selector ^
            IDiamondLoupe.facetAddresses.selector ^
            IDiamondLoupe.facetAddress.selector;
        ds.supportedInterfaces[interfaceID] = true;

        // ERC173
        ds.supportedInterfaces[IERC173.transferOwnership.selector ^
            IERC173.owner.selector] = true;
    }

    // This is an immutable functions because it is defined directly in the diamond.
    // Why is it here instead of in a facet?  No reason, just to show an immutable function.
    // This implements ERC-165.
    function supportsInterface(bytes4 _interfaceID) external override view returns (bool) {
        DiamondStorage storage ds = diamondStorage();
        return ds.supportedInterfaces[_interfaceID];
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        DiamondStorage storage ds;
        bytes32 position = DiamondStorageContract.DIAMOND_STORAGE_POSITION;
        assembly { ds.slot := position }
        address facet = address(bytes20(ds.facets[msg.sig]));  
        require(facet != address(0));      
        assembly {            
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)            
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {revert(0, returndatasize())}
            default {return (0, returndatasize())}
        }
    }

    receive() external payable {}
}
