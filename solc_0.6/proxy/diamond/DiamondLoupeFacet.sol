// SPDX-License-Identifier: MIT
pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
* from https://github.com/mudgen/Diamond/blob/ca15562a2858a4a4696526b1f6b18a4adef10617/contracts/
*
* Implementation of DiamondLoupe interface.
/******************************************************************************/

import "./DiamondStorageContract.sol";
import "./DiamondHeaders.sol";

contract DiamondLoupeFacet is DiamondLoupe, DiamondStorageContract {
    /// These functions are expected to be called frequently
    /// by tools. Therefore the return values are tightly
    /// packed for efficiency. That means no padding with zeros.

    struct Facet {
        address facet;
        bytes4[] functionSelectors;
    }

    /// @notice Gets all facets and their selectors.
    /// @return An array of bytes arrays containing each facet
    ///         and each facet's selectors.
    /// The return value is tightly packed.
    /// That means no padding with zeros.
    /// Here is the structure of the return value:
    /// returnValue = [
    ///     abi.encodePacked(facet, sel1, sel2, sel3, ...),
    ///     abi.encodePacked(facet, sel1, sel2, sel3, ...),
    ///     ...
    /// ]
    /// facet is the address of a facet.
    /// sel1, sel2, sel3 etc. are four-byte function selectors.
    function facets() external override view returns (bytes[] memory) {
        DiamondStorage storage ds = diamondStorage();
        uint256 totalSelectorSlots = ds.selectorSlotsLength;
        uint256 totalSelectors = uint128(totalSelectorSlots) *
            8 +
            uint128(totalSelectorSlots >> 128);

        // get default size of arrays
        uint256 defaultSize = totalSelectors;
        if (defaultSize > 20) {
            defaultSize = 20;
        }
        Facet[] memory facets_ = new Facet[](defaultSize);
        uint8[] memory numFacetSelectors = new uint8[](defaultSize);
        uint256 numFacets;
        uint256 selectorCount;
        // loop through function selectors
        for (uint256 slotIndex; selectorCount < totalSelectors; slotIndex++) {
            bytes32 slot = ds.selectorSlots[slotIndex];
            for (uint256 selectorIndex; selectorIndex < 8; selectorIndex++) {
                selectorCount++;
                if (selectorCount > totalSelectors) {
                    break;
                }
                bytes4 selector = bytes4(slot << (selectorIndex * 32));
                address facet = address(bytes20(ds.facets[selector]));
                bool continueLoop = false;
                for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                    if (facets_[facetIndex].facet == facet) {
                        uint256 arrayLength = facets_[facetIndex]
                            .functionSelectors
                            .length;
                        // if array is too small then enlarge it
                        if (numFacetSelectors[facetIndex] + 1 > arrayLength) {
                            bytes4[] memory biggerArray = new bytes4[](
                                arrayLength + defaultSize
                            );
                            // copy contents of old array
                            for (uint256 i; i < arrayLength; i++) {
                                biggerArray[i] = facets_[facetIndex]
                                    .functionSelectors[i];
                            }
                            facets_[facetIndex].functionSelectors = biggerArray;
                        }
                        facets_[facetIndex]
                            .functionSelectors[numFacetSelectors[facetIndex]] = selector;
                        // probably will never have more than 255 functions from one facet contract
                        require(numFacetSelectors[facetIndex] < 255);
                        numFacetSelectors[facetIndex]++;
                        continueLoop = true;
                        break;
                    }
                }
                if (continueLoop) {
                    continueLoop = false;
                    continue;
                }
                uint256 arrayLength = facets_.length;
                // if array is too small then enlarge it
                if (numFacets + 1 > arrayLength) {
                    Facet[] memory biggerArray = new Facet[](
                        arrayLength + defaultSize
                    );
                    uint8[] memory biggerArray2 = new uint8[](
                        arrayLength + defaultSize
                    );
                    for (uint256 i; i < arrayLength; i++) {
                        biggerArray[i] = facets_[i];
                        biggerArray2[i] = numFacetSelectors[i];
                    }
                    facets_ = biggerArray;
                    numFacetSelectors = biggerArray2;
                }
                facets_[numFacets].facet = facet;
                facets_[numFacets].functionSelectors = new bytes4[](
                    defaultSize
                );
                facets_[numFacets].functionSelectors[0] = selector;
                numFacetSelectors[numFacets] = 1;
                numFacets++;
            }
        }
        bytes[] memory returnFacets = new bytes[](numFacets);
        for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
            uint256 numSelectors = numFacetSelectors[facetIndex];
            bytes memory selectorsBytes = new bytes(4 * numSelectors);
            bytes4[] memory selectors = facets_[facetIndex].functionSelectors;
            uint256 bytePosition;
            for (uint256 i; i < numSelectors; i++) {
                for (uint256 j; j < 4; j++) {
                    selectorsBytes[bytePosition] = bytes1(
                        selectors[i] << (j * 8)
                    );
                    bytePosition++;
                }
            }
            returnFacets[facetIndex] = abi.encodePacked(
                facets_[facetIndex].facet,
                selectorsBytes
            );
        }
        return returnFacets;
    }

    /// @notice Gets all the function selectors supported by a specific facet.
    /// @param _facet The facet address.
    /// @return A bytes array of function selectors.
    /// The return value is tightly packed. Here is an example:
    /// return abi.encodePacked(selector1, selector2, selector3, ...)
    function facetFunctionSelectors(address _facet)
        external
        override
        view
        returns (bytes memory)
    {
        DiamondStorage storage ds = diamondStorage();
        uint256 totalSelectorSlots = ds.selectorSlotsLength;
        uint256 totalSelectors = uint128(totalSelectorSlots) *
            8 +
            uint128(totalSelectorSlots >> 128);

        uint256 numFacetSelectors;
        bytes4[] memory facetSelectors = new bytes4[](totalSelectors);
        uint256 selectorCount;
        // loop through function selectors
        for (uint256 slotIndex; selectorCount < totalSelectors; slotIndex++) {
            bytes32 slot = ds.selectorSlots[slotIndex];
            for (uint256 selectorIndex; selectorIndex < 8; selectorIndex++) {
                selectorCount++;
                if (selectorCount > totalSelectors) {
                    break;
                }
                bytes4 selector = bytes4(slot << (selectorIndex * 32));
                address facet = address(bytes20(ds.facets[selector]));
                if (_facet == facet) {
                    facetSelectors[numFacetSelectors] = selector;
                    numFacetSelectors++;
                }
            }
        }
        bytes memory returnBytes = new bytes(4 * numFacetSelectors);
        uint256 bytePosition;
        for (uint256 i; i < numFacetSelectors; i++) {
            for (uint256 j; j < 4; j++) {
                returnBytes[bytePosition] = bytes1(
                    facetSelectors[i] << (j * 8)
                );
                bytePosition++;
            }
        }
        return returnBytes;
    }

    /// @notice Get all the facet addresses used by a diamond.
    /// @return A byte array of tightly packed facet addresses.
    /// Example return value:
    /// return abi.encodePacked(facet1, facet2, facet3, ...)
    function facetAddresses() external override view returns (bytes memory) {
        DiamondStorage storage ds = diamondStorage();
        uint256 totalSelectorSlots = ds.selectorSlotsLength;
        uint256 totalSelectors = uint128(totalSelectorSlots) *
            8 +
            uint128(totalSelectorSlots >> 128);

        address[] memory facets_ = new address[](totalSelectors);
        uint256 numFacets;
        uint256 selectorCount;
        // loop through function selectors
        for (uint256 slotIndex; selectorCount < totalSelectors; slotIndex++) {
            bytes32 slot = ds.selectorSlots[slotIndex];
            for (uint256 selectorIndex; selectorIndex < 8; selectorIndex++) {
                selectorCount++;
                if (selectorCount > totalSelectors) {
                    break;
                }
                bytes4 selector = bytes4(slot << (selectorIndex * 32));
                address facet = address(bytes20(ds.facets[selector]));
                bool continueLoop = false;
                for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                    if (facet == facets_[facetIndex]) {
                        continueLoop = true;
                        break;
                    }
                }
                if (continueLoop) {
                    continueLoop = false;
                    continue;
                }
                facets_[numFacets] = facet;
                numFacets++;
            }
        }

        bytes memory returnBytes = new bytes(20 * numFacets);
        uint256 bytePosition;
        for (uint256 i; i < numFacets; i++) {
            for (uint256 j; j < 20; j++) {
                returnBytes[bytePosition] = bytes1(
                    bytes20(facets_[i]) << (j * 8)
                );
                bytePosition++;
            }
        }
        return returnBytes;
    }

    /// @notice Gets the facet that supports the given selector.
    /// @dev If facet is not found return address(0).
    /// @param _functionSelector The function selector.
    /// @return The facet address.
    function facetAddress(bytes4 _functionSelector)
        external
        override
        view
        returns (address)
    {
        DiamondStorage storage ds = diamondStorage();
        return address(bytes20(ds.facets[_functionSelector]));
    }
}
