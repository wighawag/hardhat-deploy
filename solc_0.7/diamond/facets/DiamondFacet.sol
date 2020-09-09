// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
*
* Implementation of DiamondLoupe interface.
/******************************************************************************/

import "../libraries/LibDiamondStorage.sol";
import "../interfaces/IDiamondCut.sol";
import "../interfaces/IDiamondLoupe.sol";
import "../interfaces/IERC165.sol";

contract DiamondFacet is IDiamondCut, IDiamondLoupe, IERC165 {
    // Constants used by diamondCut
    bytes32 constant CLEAR_ADDRESS_MASK = bytes32(
        uint256(0xffffffffffffffffffffffff)
    );
    bytes32 constant CLEAR_SELECTOR_MASK = bytes32(uint256(0xffffffff << 224));

    // Standard diamondCut external function
    /// @notice Add/replace/remove any number of functions and optionally execute
    ///         a function with delegatecall
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// This argument is tightly packed for gas efficiency
    /// That means no padding with zeros.
    /// Here is the structure of _diamondCut:
    /// _diamondCut = [
    ///     abi.encodePacked(facet, sel1, sel2, sel3, ...),
    ///     abi.encodePacked(facet, sel1, sel2, sel4, ...),
    ///     ...
    /// ]
    /// facet is the address of a facet
    /// sel1, sel2, sel3 etc. are four-byte function selectors.
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    ///                  _calldata is executed with delegatecall on _init
    function diamondCut(
        bytes[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        externalCut(_diamondCut);
        emit DiamondCut(_diamondCut, _init, _calldata);
        if (_calldata.length > 0) {
            address init = _init == address(0) ? address(this) : _init;
            // Check that init has contract code
            uint256 contractSize;
            assembly {
                contractSize := extcodesize(init)
            }
            require(
                contractSize > 0,
                "DiamondFacet: _init address has no code"
            );
            (bool success, bytes memory error) = init.delegatecall(_calldata);
            if (!success) {
                if (error.length > 0) {
                    // bubble up the error
                    assembly {
                        let errorSize := mload(error)
                        revert(add(32, error), errorSize)
                    }
                } else {
                    revert("DiamondFacet: _init function reverted");
                }
            }
        } else if (_init != address(0)) {
            revert("DiamondFacet: _calldata is empty");
        }
    }

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

    // diamondCut helper function
    // This code is almost the same as the internal diamondCut function,
    // except it is using 'bytes[] calldata _diamondCut' instead of
    // 'bytes[] memory _diamondCut', and it does not issue the DiamondCut event.
    // The code is duplicated to prevent copying calldata to memory which
    // causes an error for an array of bytes arrays.
    function externalCut(bytes[] calldata _diamondCut) internal {
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        require(msg.sender == ds.contractOwner, "Must own the contract.");
        SlotInfo memory slot;
        slot.originalSelectorCount = ds.selectorCount;
        // Get how many 32 byte slots are used
        uint256 selectorSlotCount = slot.originalSelectorCount / 8;
        // Get how many function selectors are in the last 32 byte slot
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
    }

    // Diamond Loupe Functions
    ////////////////////////////////////////////////////////////////////
    /// These functions are expected to be called frequently
    /// by tools. Therefore the return values are tightly
    /// packed for efficiency. That means no padding with zeros.

    // holder for variables to prevent stack too deep error
    struct Vars {
        uint256 defaultSize;
        uint256 selectorCount;
    }

    // struct Facet {
    //     address facetAddress;
    //     bytes4[] functionSelectors;
    // }
    /// @notice Gets all facets and their selectors.
    /// @return facets_ Facet
    function facets() external override view returns (Facet[] memory facets_) {
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        Vars memory vars;
        vars.selectorCount = ds.selectorCount;
        // get default size of arrays
        vars.defaultSize = vars.selectorCount;
        if (vars.defaultSize > 20) {
            vars.defaultSize = 20;
        }
        facets_ = new Facet[](vars.defaultSize);
        uint8[] memory numFacetSelectors = new uint8[](vars.defaultSize);
        uint256 numFacets;
        uint256 selectorIndex;
        // loop through function selectors
        for (
            uint256 slotIndex;
            selectorIndex < vars.selectorCount;
            slotIndex++
        ) {
            bytes32 slot = ds.selectorSlots[slotIndex];
            for (
                uint256 selectorSlotIndex;
                selectorSlotIndex < 8;
                selectorSlotIndex++
            ) {
                selectorIndex++;
                if (selectorIndex > vars.selectorCount) {
                    break;
                }
                bytes4 selector = bytes4(slot << (selectorSlotIndex * 32));
                address facet = address(bytes20(ds.facets[selector]));
                bool continueLoop = false;
                for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                    if (facets_[facetIndex].facetAddress == facet) {
                        uint256 arrayLength = facets_[facetIndex]
                            .functionSelectors
                            .length;
                        // if array is too small then enlarge it
                        if (numFacetSelectors[facetIndex] + 1 > arrayLength) {
                            bytes4[] memory biggerArray = new bytes4[](
                                arrayLength + vars.defaultSize
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
                        arrayLength + vars.defaultSize
                    );
                    uint8[] memory biggerArray2 = new uint8[](
                        arrayLength + vars.defaultSize
                    );
                    for (uint256 i; i < arrayLength; i++) {
                        biggerArray[i] = facets_[i];
                        biggerArray2[i] = numFacetSelectors[i];
                    }
                    facets_ = biggerArray;
                    numFacetSelectors = biggerArray2;
                }
                facets_[numFacets].facetAddress = facet;
                facets_[numFacets].functionSelectors = new bytes4[](
                    vars.defaultSize
                );
                facets_[numFacets].functionSelectors[0] = selector;
                numFacetSelectors[numFacets] = 1;
                numFacets++;
            }
        }
        for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
            uint256 numSelectors = numFacetSelectors[facetIndex];
            bytes4[] memory selectors = facets_[facetIndex].functionSelectors;
            // setting the number of selectors
            assembly {
                mstore(selectors, numSelectors)
            }
        }
        // setting the number of facets
        assembly {
            mstore(facets_, numFacets)
        }
    }

    /// @notice Gets all the function selectors supported by a specific facet.
    /// @param _facet The facet address.
    /// @return _facetFunctionSelectors The selectors associated with a facet address.
    function facetFunctionSelectors(address _facet)
        external
        override
        view
        returns (bytes4[] memory _facetFunctionSelectors)
    {
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        uint256 selectorCount = ds.selectorCount;

        uint256 numSelectors;
        _facetFunctionSelectors = new bytes4[](selectorCount);
        uint256 selectorIndex;
        // loop through function selectors
        for (uint256 slotIndex; selectorIndex < selectorCount; slotIndex++) {
            bytes32 slot = ds.selectorSlots[slotIndex];
            for (
                uint256 selectorSlotIndex;
                selectorSlotIndex < 8;
                selectorSlotIndex++
            ) {
                selectorIndex++;
                if (selectorIndex > selectorCount) {
                    break;
                }
                bytes4 selector = bytes4(slot << (selectorSlotIndex * 32));
                address facet = address(bytes20(ds.facets[selector]));
                if (_facet == facet) {
                    _facetFunctionSelectors[numSelectors] = selector;
                    numSelectors++;
                }
            }
        }
        // Set the number of selectors in the array
        assembly {
            mstore(_facetFunctionSelectors, numSelectors)
        }
    }

    /// @notice Get all the facet addresses used by a diamond.
    /// @return facetAddresses_
    function facetAddresses()
        external
        override
        view
        returns (address[] memory facetAddresses_)
    {
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        uint256 selectorCount = ds.selectorCount;

        facetAddresses_ = new address[](selectorCount);
        uint256 numFacets;
        uint256 selectorIndex;
        // loop through function selectors
        for (uint256 slotIndex; selectorIndex < selectorCount; slotIndex++) {
            bytes32 slot = ds.selectorSlots[slotIndex];
            for (
                uint256 selectorSlotIndex;
                selectorSlotIndex < 8;
                selectorSlotIndex++
            ) {
                selectorIndex++;
                if (selectorIndex > selectorCount) {
                    break;
                }
                bytes4 selector = bytes4(slot << (selectorSlotIndex * 32));
                address facet = address(bytes20(ds.facets[selector]));
                bool continueLoop = false;
                for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                    if (facet == facetAddresses_[facetIndex]) {
                        continueLoop = true;
                        break;
                    }
                }
                if (continueLoop) {
                    continueLoop = false;
                    continue;
                }
                facetAddresses_[numFacets] = facet;
                numFacets++;
            }
        }
        // Set the number of facet addresses in the array
        assembly {
            mstore(facetAddresses_, numFacets)
        }
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
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        return address(bytes20(ds.facets[_functionSelector]));
    }

    // This implements ERC-165.
    function supportsInterface(bytes4 _interfaceId)
        external
        override
        view
        returns (bool)
    {
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage
            .diamondStorage();
        return ds.supportedInterfaces[_interfaceId];
    }
}
