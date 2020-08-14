// SPDX-License-Identifier: MIT
pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

// * from https://github.com/mudgen/Diamond/blob/ca15562a2858a4a4696526b1f6b18a4adef10617/contracts/

interface Diamond {
    /// @notice _diamondCut is an array of bytes arrays.
    /// This argument is tightly packed for gas efficiency.
    /// That means no padding with zeros.
    /// Here is the structure of _diamondCut:
    /// _diamondCut = [
    ///     abi.encodePacked(facet, sel1, sel2, sel3, ...),
    ///     abi.encodePacked(facet, sel1, sel2, sel4, ...),
    ///     ...
    /// ]
    /// facet is the address of a facet
    /// sel1, sel2, sel3 etc. are four-byte function selectors.
    function diamondCut(bytes[] calldata _diamondCut) external;

    event DiamondCut(bytes[] _diamondCut);
}

// A loupe is a small magnifying glass used to look at diamonds.
// These functions look at diamonds
interface DiamondLoupe {
    /// These functions are expected to be called frequently
    /// by tools. Therefore the return values are tightly
    /// packed for efficiency. That means no padding with zeros.

    /// @notice Gets all facets and their selectors.
    /// @return An array of bytes arrays containing each facet
    ///         and each facet's selectors.
    /// The return value is tightly packed.
    /// Here is the structure of the return value:
    /// returnValue = [
    ///     abi.encodePacked(facet, sel1, sel2, sel3, ...),
    ///     abi.encodePacked(facet, sel1, sel2, sel3, ...),
    ///     ...
    /// ]
    /// facet is the address of a facet.
    /// sel1, sel2, sel3 etc. are four-byte function selectors.
    function facets() external view returns (bytes[] memory);

    /// @notice Gets all the function selectors supported by a specific facet.
    /// @param _facet The facet address.
    /// @return A byte array of function selectors.
    /// The return value is tightly packed. Here is an example:
    /// return abi.encodePacked(selector1, selector2, selector3, ...)
    function facetFunctionSelectors(address _facet)
        external
        view
        returns (bytes memory);

    /// @notice Get all the facet addresses used by a diamond.
    /// @return A byte array of tightly packed facet addresses.
    /// Example return value:
    /// return abi.encodePacked(facet1, facet2, facet3, ...)
    function facetAddresses() external view returns (bytes memory);

    /// @notice Gets the facet that supports the given selector.
    /// @dev If facet is not found return address(0).
    /// @param _functionSelector The function selector.
    /// @return The facet address.
    function facetAddress(bytes4 _functionSelector)
        external
        view
        returns (address);
}

interface ERC165 {
    /// @notice Query if a contract implements an interface
    /// @param interfaceID The interface identifier, as specified in ERC-165
    /// @dev Interface identification is specified in ERC-165. This function
    ///  uses less than 30,000 gas.
    /// @return `true` if the contract implements `interfaceID` and
    ///  `interfaceID` is not 0xffffffff, `false` otherwise
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}
