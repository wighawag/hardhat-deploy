// SPDX-License-Identifier: MIT
pragma solidity ^0.6.4;

// * from https://github.com/mudgen/Diamond/blob/ca15562a2858a4a4696526b1f6b18a4adef10617/contracts/

contract DiamondStorageContract {
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
        mapping(uint256 => bytes32) selectorSlots;
        // uint32 selectorSlotLength, uint32 selectorSlotsLength
        // selectorSlotsLength is the number of 32-byte slots in selectorSlots.
        // selectorSlotLength is the number of selectors in the last slot of
        // selectorSlots.
        uint256 selectorSlotsLength;
        // Used to query if a contract implements an interface.
        // Used to implement ERC-165.
        mapping(bytes4 => bool) supportedInterfaces;
    }

    function diamondStorage()
        internal
        pure
        returns (DiamondStorage storage ds)
    {
        // ds_slot = keccak256("diamond.standard.diamond.storage");
        assembly {
            ds_slot := 0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131c
        }
    }
}
