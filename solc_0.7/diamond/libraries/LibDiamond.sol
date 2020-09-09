// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
*
* Implementation of Diamond facet.
* This is gas optimized by reducing storage reads and storage writes.
* This code is as complex as it is to reduce gas costs.
/******************************************************************************/

import {LibDiamondStorage} from "./LibDiamondStorage.sol";

library LibDiamond {
    event DiamondCut(bytes[] _diamondCut, address _init, bytes _calldata);

    bytes32 constant CLEAR_ADDRESS_MASK = bytes32(
        uint256(0xffffffffffffffffffffffff)
    );
    bytes32 constant CLEAR_SELECTOR_MASK = bytes32(uint256(0xffffffff << 224));

    // This struct is used to prevent getting the error "CompilerError: Stack too deep, try removing local variables."
    // See this article: https://medium.com/1milliondevs/compilererror-stack-too-deep-try-removing-local-variables-solved-a6bcecc16231
    struct SlotInfo {
        uint256 originalSelectorCount;
        uint256 newSelectorCount;
        bytes32 selectorSlot;
        uint256 oldSelectorsSlotCount;
        uint256 oldSelectorsInSlot;
        bytes32 oldSelectorSlot;
        bool updateLastSlot;
    }

    // Non-standard internal function version of diamondCut
    // This code is almost the same as externalCut, except it is using
    // 'bytes[] memory _diamondCut' instead of 'bytes[] calldata _diamondCut'
    // and it DOES issue the DiamondCut event
    // The code is duplicated to prevent copying calldata to memory which
    // causes an error for an array of bytes arrays.
    function diamondCut(bytes[] memory _diamondCut) internal {
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        SlotInfo memory slot;
        slot.originalSelectorCount = ds.selectorCount;
        uint256 selectorSlotCount = slot.originalSelectorCount / 8;
        uint256 selectorsInSlot = slot.originalSelectorCount % 8;
        if (selectorsInSlot > 0) {
            slot.selectorSlot = ds.selectorSlots[selectorSlotCount];
        }
        // loop through diamond cut
        for (
            uint256 diamondCutIndex;
            diamondCutIndex < _diamondCut.length;
            diamondCutIndex++
        ) {
            bytes memory facetCut = _diamondCut[diamondCutIndex];
            require(
                facetCut.length > 20,
                "LibDiamond: Missing facet or selector info."
            );
            bytes32 currentSlot;
            assembly {
                currentSlot := mload(add(facetCut, 32))
            }
            bytes32 newFacet = bytes20(currentSlot);
            uint256 numSelectors = (facetCut.length - 20) / 4;
            uint256 position = 52;

            // adding or replacing functions
            if (newFacet != 0) {
                // add and replace selectors
                for (
                    uint256 selectorIndex;
                    selectorIndex < numSelectors;
                    selectorIndex++
                ) {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(facetCut, position))
                    }
                    position += 4;
                    bytes32 oldFacet = ds.facets[selector];
                    // add
                    if (oldFacet == 0) {
                        // update the last slot at then end of the function
                        slot.updateLastSlot = true;
                        ds.facets[selector] =
                            newFacet |
                            (bytes32(selectorsInSlot) << 64) |
                            bytes32(selectorSlotCount);
                        // clear selector position in slot and add selector
                        slot.selectorSlot =
                            (slot.selectorSlot &
                                ~(CLEAR_SELECTOR_MASK >>
                                    (selectorsInSlot * 32))) |
                            (bytes32(selector) >> (selectorsInSlot * 32));
                        selectorsInSlot++;
                        // if slot is full then write it to storage
                        if (selectorsInSlot == 8) {
                            ds.selectorSlots[selectorSlotCount] = slot
                                .selectorSlot;
                            slot.selectorSlot = 0;
                            selectorsInSlot = 0;
                            selectorSlotCount++;
                        }
                    } else {
                        // replace
                        require(
                            bytes20(oldFacet) != bytes20(newFacet),
                            "Function cut to same facet."
                        );
                        // replace old facet address
                        ds.facets[selector] =
                            (oldFacet & CLEAR_ADDRESS_MASK) |
                            newFacet;
                    }
                }
            } else {
                // remove functions
                slot.updateLastSlot = true;
                for (
                    uint256 selectorIndex;
                    selectorIndex < numSelectors;
                    selectorIndex++
                ) {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(facetCut, position))
                    }
                    position += 4;
                    bytes32 oldFacet = ds.facets[selector];
                    require(
                        oldFacet != 0,
                        "Function doesn't exist. Can't remove."
                    );
                    // Current slot is empty so get the slot before it
                    if (slot.selectorSlot == 0) {
                        selectorSlotCount--;
                        slot.selectorSlot = ds.selectorSlots[selectorSlotCount];
                        selectorsInSlot = 8;
                    }
                    slot.oldSelectorsSlotCount = uint64(uint256(oldFacet));
                    slot.oldSelectorsInSlot = uint32(uint256(oldFacet >> 64));
                    // gets the last selector in the slot
                    bytes4 lastSelector = bytes4(
                        slot.selectorSlot << ((selectorsInSlot - 1) * 32)
                    );
                    if (slot.oldSelectorsSlotCount != selectorSlotCount) {
                        slot.oldSelectorSlot = ds.selectorSlots[slot
                            .oldSelectorsSlotCount];
                        // clears the selector we are deleting and puts the last selector in its place.
                        slot.oldSelectorSlot =
                            (slot.oldSelectorSlot &
                                ~(CLEAR_SELECTOR_MASK >>
                                    (slot.oldSelectorsInSlot * 32))) |
                            (bytes32(lastSelector) >>
                                (slot.oldSelectorsInSlot * 32));
                        // update storage with the modified slot
                        ds.selectorSlots[slot.oldSelectorsSlotCount] = slot
                            .oldSelectorSlot;
                        selectorsInSlot--;
                    } else {
                        // clears the selector we are deleting and puts the last selector in its place.
                        slot.selectorSlot =
                            (slot.selectorSlot &
                                ~(CLEAR_SELECTOR_MASK >>
                                    (slot.oldSelectorsInSlot * 32))) |
                            (bytes32(lastSelector) >>
                                (slot.oldSelectorsInSlot * 32));
                        selectorsInSlot--;
                    }
                    if (selectorsInSlot == 0) {
                        delete ds.selectorSlots[selectorSlotCount];
                        slot.selectorSlot = 0;
                    }
                    if (lastSelector != selector) {
                        // update last selector slot position info
                        ds.facets[lastSelector] =
                            (oldFacet & CLEAR_ADDRESS_MASK) |
                            bytes20(ds.facets[lastSelector]);
                    }
                    delete ds.facets[selector];
                }
            }
        }
        slot.newSelectorCount = selectorSlotCount * 8 + selectorsInSlot;
        if (slot.newSelectorCount != slot.originalSelectorCount) {
            ds.selectorCount = slot.newSelectorCount;
        }
        if (slot.updateLastSlot && selectorsInSlot > 0) {
            ds.selectorSlots[selectorSlotCount] = slot.selectorSlot;
        }
        emit DiamondCut(_diamondCut, address(0), new bytes(0));
    }
}
