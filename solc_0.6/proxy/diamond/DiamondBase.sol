pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
* from https://github.com/mudgen/Diamond/blob/8235e6b63b47aab08a81c6f73bfb7faafda79ca4/contracts/
*
* slightly modified by Ronan Sandford
* modifications includes
* - formatting
* - rename to DiamondBase
* - allow to pass owner in constructor
* - reject on receive()
* - use ERC173Events for Ownership event
* - use OwnershipFacet for allowing owner to change owner
*
* Implementation of an example of a diamond.
/******************************************************************************/

import "./ERC173.sol";
import "./OwnershipFacet.sol";
import "./DiamondStorageContract.sol";
import "./DiamondHeaders.sol";
import "./DiamondFacet.sol";
import "./DiamondLoupeFacet.sol";

contract DiamondBase is ERC173Events, DiamondStorageContract {
    constructor(address owner) public {
        DiamondStorage storage ds = diamondStorage();
        ds.contractOwner = owner;
        emit OwnershipTransferred(address(0), owner);

        // Create a DiamondFacet contract which implements the Diamond interface
        DiamondFacet diamondFacet = new DiamondFacet();

        // Create a DiamondLoupeFacet contract which implements the Diamond Loupe interface
        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();

        // Create a OwnershipFacet contract which implements the ERC-173 Ownership interface
        OwnershipFacet ownershipFacet = new OwnershipFacet();

        bytes[] memory diamondCut = new bytes[](4);

        // Adding cut function
        diamondCut[0] = abi.encodePacked(
            diamondFacet,
            Diamond.diamondCut.selector
        );

        // Adding diamond loupe functions
        diamondCut[1] = abi.encodePacked(
            diamondLoupeFacet,
            DiamondLoupe.facetFunctionSelectors.selector,
            DiamondLoupe.facets.selector,
            DiamondLoupe.facetAddress.selector,
            DiamondLoupe.facetAddresses.selector
        );

        // Adding diamond ERC173 functions
        diamondCut[2] = abi.encodePacked(
            ownershipFacet,
            ERC173.transferOwnership.selector,
            ERC173.owner.selector
        );

        // Adding supportsInterface function
        diamondCut[3] = abi.encodePacked(
            address(this),
            ERC165.supportsInterface.selector
        );

        // execute cut function
        bytes memory cutFunction = abi.encodeWithSelector(
            Diamond.diamondCut.selector,
            diamondCut
        );
        (bool success, ) = address(diamondFacet).delegatecall(cutFunction);
        require(success, "Adding functions failed.");

        // adding ERC165 data
        // ERC165
        ds.supportedInterfaces[ERC165.supportsInterface.selector] = true;

        // DiamondCut
        ds.supportedInterfaces[Diamond.diamondCut.selector] = true;

        // DiamondLoupe
        bytes4 interfaceID = DiamondLoupe.facets.selector ^
            DiamondLoupe.facetFunctionSelectors.selector ^
            DiamondLoupe.facetAddresses.selector ^
            DiamondLoupe.facetAddress.selector;
        ds.supportedInterfaces[interfaceID] = true;

        // ERC173
        ds.supportedInterfaces[ERC173.transferOwnership.selector ^
            ERC173.owner.selector] = true;
    }

    // This is an immutable functions because it is defined directly in the diamond.
    // This implements ERC-165.
    function supportsInterface(bytes4 _interfaceID)
        external
        view
        returns (bool)
    {
        DiamondStorage storage ds = diamondStorage();
        return ds.supportedInterfaces[_interfaceID];
    }

    // Finds facet for function that is called and executes the
    // function if it is found and returns any value.
    fallback() external payable {
        DiamondStorage storage ds = diamondStorage();
        address facet = address(bytes20(ds.facets[msg.sig]));
        require(facet != address(0), "Function does not exist.");
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), facet, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)
            switch result
                case 0 {
                    revert(ptr, size)
                }
                default {
                    return(ptr, size)
                }
        }
    }

    receive() external payable {
        revert("DATA_EMPTY");
    }
}
