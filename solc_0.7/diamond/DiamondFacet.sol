// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
*
* Implementation of Diamond facet.
* This is gas optimized by reducing storage reads and storage writes.
* This code is as complex as it is to reduce gas costs.
/******************************************************************************/

import "./DiamondStorageContract.sol";
import "./DiamondHeaders.sol";

contract DiamondFacet is IDiamond, DiamondStorageContract {
    bytes32 constant CLEAR_ADDRESS_MASK = 0x0000000000000000000000000000000000000000ffffffffffffffffffffffff;
    bytes32 constant CLEAR_SELECTOR_MASK = 0xffffffff00000000000000000000000000000000000000000000000000000000;

    // Standard diamondCut external function
    function diamondCut(bytes[] calldata _diamondCut, address _init, bytes calldata _calldata) external override {        
        externalCut(_diamondCut);        
        if(_calldata.length > 0) {
            address init = _init == address(0)? address(this) : _init;
            // Check that init has contract code
            uint contractSize;
            assembly { contractSize := extcodesize(init) }
            require(contractSize > 0, "DiamondFacet: _init address has no code");
            (bool success, bytes memory error) = init.delegatecall(_calldata);
            if(!success) {
                if(error.length > 0) {
                    // bubble up the error
                    assembly {
                        let errorSize := mload(error)
                        revert(add(32, error), errorSize)
                    }
                }
                else {
                    revert("DiamondFacet: _init function reverted");
                }
            }                        
        }
        else if(_init != address(0)) {
            revert("DiamondFacet: _calldata is empty");
        }                       
        emit DiamondCut(_diamondCut, _init, _calldata);
    }

    // This struct is used to prevent getting the error "CompilerError: Stack too deep, try removing local variables."
    // See this article: https://medium.com/1milliondevs/compilererror-stack-too-deep-try-removing-local-variables-solved-a6bcecc16231
    struct SlotInfo {
        uint originalSelectorSlotsLength;
        bytes32 selectorSlot;
        uint oldSelectorSlotsIndex;
        uint oldSelectorSlotIndex;
        bytes32 oldSelectorSlot;
        bool updateLastSlot;
    }

    // Non-standard internal function version of diamondCut 
    // This code is exaclty the same as externalCut, except it is using
    // 'bytes[] memory _diamondCut' instead of 'bytes[] calldata _diamondCut'
    // The code is duplicated to prevent copying calldata to memory which
    // causes an error for an array of bytes arrays.
    function diamondCut(bytes[] memory _diamondCut) internal {
        DiamondStorage storage ds = diamondStorage();
        require(msg.sender == ds.contractOwner, "Must own the contract.");
        SlotInfo memory slot;
        slot.originalSelectorSlotsLength = ds.selectorSlotsLength;
        uint selectorSlotsLength = uint128(slot.originalSelectorSlotsLength);
        uint selectorSlotLength = uint128(slot.originalSelectorSlotsLength >> 128);
        if(selectorSlotLength > 0) {
            slot.selectorSlot = ds.selectorSlots[selectorSlotsLength];
        }
        // loop through diamond cut
        for(uint diamondCutIndex; diamondCutIndex < _diamondCut.length; diamondCutIndex++) {
            bytes memory facetCut = _diamondCut[diamondCutIndex];
            require(facetCut.length > 20, "Missing facet or selector info.");
            bytes32 currentSlot;
            assembly {
                currentSlot := mload(add(facetCut,32))
            }
            bytes32 newFacet = bytes20(currentSlot);
            uint numSelectors = (facetCut.length - 20) / 4;
            uint position = 52;

            // adding or replacing functions
            if(newFacet != 0) {                
                // add and replace selectors
                for(uint selectorIndex; selectorIndex < numSelectors; selectorIndex++) {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(facetCut,position))
                    }
                    position += 4;
                    bytes32 oldFacet = ds.facets[selector];
                    // add
                    if(oldFacet == 0) {
                        // update the last slot at then end of the function
                        slot.updateLastSlot = true;
                        ds.facets[selector] = newFacet | bytes32(selectorSlotLength) << 64 | bytes32(selectorSlotsLength);
                        // clear selector position in slot and add selector
                        slot.selectorSlot = slot.selectorSlot & ~(CLEAR_SELECTOR_MASK >> selectorSlotLength * 32) | bytes32(selector) >> selectorSlotLength * 32;
                        selectorSlotLength++;
                        // if slot is full then write it to storage
                        if(selectorSlotLength == 8) {
                            ds.selectorSlots[selectorSlotsLength] = slot.selectorSlot;
                            slot.selectorSlot = 0;
                            selectorSlotLength = 0;
                            selectorSlotsLength++;
                        }
                    }
                    // replace
                    else {
                        require(bytes20(oldFacet) != bytes20(newFacet), "Function cut to same facet.");
                        // replace old facet address
                        ds.facets[selector] = oldFacet & CLEAR_ADDRESS_MASK | newFacet;
                    }
                }
            }
            // remove functions
            else {
                slot.updateLastSlot = true;
                for(uint selectorIndex; selectorIndex < numSelectors; selectorIndex++) {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(facetCut,position))
                    }
                    position += 4;
                    bytes32 oldFacet = ds.facets[selector];
                    require(oldFacet != 0, "Function doesn't exist. Can't remove.");
                    // Current slot is empty so get the slot before it
                    if(slot.selectorSlot == 0) {
                        selectorSlotsLength--;
                        slot.selectorSlot = ds.selectorSlots[selectorSlotsLength];
                        selectorSlotLength = 8;
                    }
                    slot.oldSelectorSlotsIndex = uint64(uint(oldFacet));
                    slot.oldSelectorSlotIndex = uint32(uint(oldFacet >> 64));
                    // gets the last selector in the slot
                    bytes4 lastSelector = bytes4(slot.selectorSlot << (selectorSlotLength-1) * 32);
                    if(slot.oldSelectorSlotsIndex != selectorSlotsLength) {
                        slot.oldSelectorSlot = ds.selectorSlots[slot.oldSelectorSlotsIndex];
                        // clears the selector we are deleting and puts the last selector in its place.
                        slot.oldSelectorSlot = slot.oldSelectorSlot & ~(CLEAR_SELECTOR_MASK >> slot.oldSelectorSlotIndex * 32) | bytes32(lastSelector) >> slot.oldSelectorSlotIndex * 32;
                        // update storage with the modified slot
                        ds.selectorSlots[slot.oldSelectorSlotsIndex] = slot.oldSelectorSlot;
                        selectorSlotLength--;
                    }
                    else {
                        // clears the selector we are deleting and puts the last selector in its place.
                        slot.selectorSlot = slot.selectorSlot & ~(CLEAR_SELECTOR_MASK >> slot.oldSelectorSlotIndex * 32) | bytes32(lastSelector) >> slot.oldSelectorSlotIndex * 32;
                        selectorSlotLength--;                        
                    }
                    if(selectorSlotLength == 0) {
                        delete ds.selectorSlots[selectorSlotsLength];
                        slot.selectorSlot = 0;                        
                    }
                    if(lastSelector != selector) {
                        // update last selector slot position info
                        ds.facets[lastSelector] = oldFacet & CLEAR_ADDRESS_MASK | bytes20(ds.facets[lastSelector]);
                    }
                    delete ds.facets[selector];
                }
            }
        }
        uint newSelectorSlotsLength = selectorSlotLength << 128 | selectorSlotsLength;
        if(newSelectorSlotsLength != slot.originalSelectorSlotsLength) {
            ds.selectorSlotsLength = newSelectorSlotsLength;
        }
        if(slot.updateLastSlot && selectorSlotLength > 0) {
            ds.selectorSlots[selectorSlotsLength] = slot.selectorSlot;
        }        
        emit DiamondCut(_diamondCut, address(0), new bytes(0));
    }

    // diamondCut helper function
    // This code is exaclty the same as the internal diamondCut function, 
    // except it is using 'bytes[] calldata _diamondCut' instead of 
    // 'bytes[] memory _diamondCut'
    // The code is duplicated to prevent copying calldata to memory which
    // causes an error for an array of bytes arrays.
    function externalCut(bytes[] calldata _diamondCut) internal {
        DiamondStorage storage ds = diamondStorage();
        require(msg.sender == ds.contractOwner, "Must own the contract.");
        SlotInfo memory slot;
        slot.originalSelectorSlotsLength = ds.selectorSlotsLength;
        uint selectorSlotsLength = uint128(slot.originalSelectorSlotsLength);
        uint selectorSlotLength = uint128(slot.originalSelectorSlotsLength >> 128);
        if(selectorSlotLength > 0) {
            slot.selectorSlot = ds.selectorSlots[selectorSlotsLength];
        }
        // loop through diamond cut
        for(uint diamondCutIndex; diamondCutIndex < _diamondCut.length; diamondCutIndex++) {
            bytes memory facetCut = _diamondCut[diamondCutIndex];
            require(facetCut.length > 20, "Missing facet or selector info.");
            bytes32 currentSlot;
            assembly {
                currentSlot := mload(add(facetCut,32))
            }
            bytes32 newFacet = bytes20(currentSlot);
            uint numSelectors = (facetCut.length - 20) / 4;
            uint position = 52;

            // adding or replacing functions
            if(newFacet != 0) {                
                // add and replace selectors
                for(uint selectorIndex; selectorIndex < numSelectors; selectorIndex++) {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(facetCut,position))
                    }
                    position += 4;
                    bytes32 oldFacet = ds.facets[selector];
                    // add
                    if(oldFacet == 0) {
                        // update the last slot at then end of the function
                        slot.updateLastSlot = true;
                        ds.facets[selector] = newFacet | bytes32(selectorSlotLength) << 64 | bytes32(selectorSlotsLength);
                        // clear selector position in slot and add selector
                        slot.selectorSlot = slot.selectorSlot & ~(CLEAR_SELECTOR_MASK >> selectorSlotLength * 32) | bytes32(selector) >> selectorSlotLength * 32;
                        selectorSlotLength++;
                        // if slot is full then write it to storage
                        if(selectorSlotLength == 8) {
                            ds.selectorSlots[selectorSlotsLength] = slot.selectorSlot;
                            slot.selectorSlot = 0;
                            selectorSlotLength = 0;
                            selectorSlotsLength++;
                        }
                    }
                    // replace
                    else {
                        require(bytes20(oldFacet) != bytes20(newFacet), "Function cut to same facet.");
                        // replace old facet address
                        ds.facets[selector] = oldFacet & CLEAR_ADDRESS_MASK | newFacet;
                    }
                }
            }
            // remove functions
            else {
                slot.updateLastSlot = true;
                for(uint selectorIndex; selectorIndex < numSelectors; selectorIndex++) {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(facetCut,position))
                    }
                    position += 4;
                    bytes32 oldFacet = ds.facets[selector];
                    require(oldFacet != 0, "Function doesn't exist. Can't remove.");
                    // Current slot is empty so get the slot before it
                    if(slot.selectorSlot == 0) {
                        selectorSlotsLength--;
                        slot.selectorSlot = ds.selectorSlots[selectorSlotsLength];
                        selectorSlotLength = 8;
                    }
                    slot.oldSelectorSlotsIndex = uint64(uint(oldFacet));
                    slot.oldSelectorSlotIndex = uint32(uint(oldFacet >> 64));
                    // gets the last selector in the slot
                    bytes4 lastSelector = bytes4(slot.selectorSlot << (selectorSlotLength-1) * 32);
                    if(slot.oldSelectorSlotsIndex != selectorSlotsLength) {
                        slot.oldSelectorSlot = ds.selectorSlots[slot.oldSelectorSlotsIndex];
                        // clears the selector we are deleting and puts the last selector in its place.
                        slot.oldSelectorSlot = slot.oldSelectorSlot & ~(CLEAR_SELECTOR_MASK >> slot.oldSelectorSlotIndex * 32) | bytes32(lastSelector) >> slot.oldSelectorSlotIndex * 32;
                        // update storage with the modified slot
                        ds.selectorSlots[slot.oldSelectorSlotsIndex] = slot.oldSelectorSlot;
                        selectorSlotLength--;
                    }
                    else {
                        // clears the selector we are deleting and puts the last selector in its place.
                        slot.selectorSlot = slot.selectorSlot & ~(CLEAR_SELECTOR_MASK >> slot.oldSelectorSlotIndex * 32) | bytes32(lastSelector) >> slot.oldSelectorSlotIndex * 32;
                        selectorSlotLength--;                        
                    }
                    if(selectorSlotLength == 0) {
                        delete ds.selectorSlots[selectorSlotsLength];
                        slot.selectorSlot = 0;                        
                    }
                    if(lastSelector != selector) {
                        // update last selector slot position info
                        ds.facets[lastSelector] = oldFacet & CLEAR_ADDRESS_MASK | bytes20(ds.facets[lastSelector]);
                    }
                    delete ds.facets[selector];
                }
            }
        }
        uint newSelectorSlotsLength = selectorSlotLength << 128 | selectorSlotsLength;
        if(newSelectorSlotsLength != slot.originalSelectorSlotsLength) {
            ds.selectorSlotsLength = newSelectorSlotsLength;
        }
        if(slot.updateLastSlot && selectorSlotLength > 0) {
            ds.selectorSlots[selectorSlotsLength] = slot.selectorSlot;
        }        
    }
}
