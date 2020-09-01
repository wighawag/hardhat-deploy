// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract DiamondStorageContract {

    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");

    struct DiamondStorage {

        // owner of the contract
        address contractOwner;

        // maps function selectors to the facets that execute the functions.
        // and maps the selectors to the slot in the selectorSlots array.
        // and maps the selectors to the position in the slot.
        // func selector => address facet, uint32 slotIndex, uint64 slotsIndex
        mapping(bytes4 => bytes32) facets;

        // array of slots of function selectors.
        // each slot holds 8 function selectors.
        mapping(uint => bytes32) selectorSlots;

        // uint32 selectorSlotLength, uint32 selectorSlotsLength
        // selectorSlotsLength is the number of 32-byte slots in selectorSlots.
        // selectorSlotLength is the number of selectors in the last slot of
        // selectorSlots.
        uint selectorSlotsLength;

        // Used to query if a contract implements an interface.
        // Used to implement ERC-165.
        mapping(bytes4 => bool) supportedInterfaces;
    }


    function diamondStorage() internal pure returns(DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly { ds.slot := position }
    }
}
