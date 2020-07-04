pragma solidity ^0.6.4;

// * from https://github.com/mudgen/Diamond/blob/8235e6b63b47aab08a81c6f73bfb7faafda79ca4/contracts/

// modified to be an abstract

abstract contract DiamondStorageContract {
    struct DiamondStorage {
        // owner of the contract
        address contractOwner;
        // maps function selectors to the facets that execute the functions.
        // and maps the selectors to the slot in the selectorSlots array.
        // and maps the selectors to the position in the slot.
        // func selector => address facet, uint64 slotsIndex, uint64 slotIndex
        mapping(bytes4 => bytes32) facets;
        // array of slots of function selectors.
        // each slot holds 8 function selectors.
        mapping(uint256 => bytes32) selectorSlots;
        // uint128 numSelectorsInSlot, uint128 selectorSlotsLength
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
