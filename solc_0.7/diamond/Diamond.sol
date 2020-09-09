// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
*
* Implementation of an example of a diamond.
/******************************************************************************/

import "./libraries/LibDiamondStorage.sol";
import "./libraries/LibDiamond.sol";
import "./facets/OwnershipFacet.sol";
import "./facets/DiamondFacet.sol";

contract Diamond {
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor(address owner) payable {
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        ds.contractOwner = owner;
        emit OwnershipTransferred(address(0), owner);

        // Create a DiamondFacet contract which implements the Diamond interface
        DiamondFacet diamondFacet = new DiamondFacet();

        // Create a OwnershipFacet contract which implements the ERC-173 Ownership interface
        OwnershipFacet ownershipFacet = new OwnershipFacet();

        bytes[] memory cut = new bytes[](2);

        // Adding diamond functions
        cut[0] = abi.encodePacked(
            diamondFacet,
            DiamondFacet.diamondCut.selector,
            DiamondFacet.facetFunctionSelectors.selector,
            DiamondFacet.facets.selector,
            DiamondFacet.facetAddress.selector,
            DiamondFacet.facetAddresses.selector,
            DiamondFacet.supportsInterface.selector
        );

        // Adding diamond ERC173 functions
        cut[1] = abi.encodePacked(
            ownershipFacet,
            OwnershipFacet.transferOwnership.selector,
            OwnershipFacet.owner.selector
        );

        // execute non-standard internal diamondCut function to add functions
        LibDiamond.diamondCut(cut);

        // adding ERC165 data
        // ERC165
        ds.supportedInterfaces[IERC165.supportsInterface.selector] = true;

        // DiamondCut
        ds.supportedInterfaces[DiamondFacet.diamondCut.selector] = true;

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

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibDiamondStorage.DiamondStorage storage ds;
        bytes32 position = LibDiamondStorage.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
        address facet = address(bytes20(ds.facets[msg.sig]));
        require(facet != address(0));
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

    receive() external payable {}
}
