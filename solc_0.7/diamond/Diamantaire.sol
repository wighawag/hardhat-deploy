// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "./interfaces/IDiamondCut.sol";
import "./Diamond.sol";
import "./facets/DiamondCutFacet.sol";
import "./facets/DiamondLoupeFacet.sol";
import "./facets/OwnershipFacet.sol";

contract Diamantaire {
    event DiamondCreated(Diamond diamond);

    IDiamondCut.FacetCut[] internal _builtinDiamondCut;

    constructor() {
        bytes4[] memory functionSelectors;

        // -------------------------------------------------------------------------
        // adding diamondCut function
        // -------------------------------------------------------------------------
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();

        functionSelectors = new bytes4[](1);
        functionSelectors[0] = DiamondCutFacet.diamondCut.selector;
        _builtinDiamondCut.push(IDiamondCut.FacetCut({
            facetAddress:address(diamondCutFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        }));


        // -------------------------------------------------------------------------
        // adding diamond loupe functions
        // -------------------------------------------------------------------------
        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();

        functionSelectors = new bytes4[](5);
        functionSelectors[0] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        functionSelectors[1] = DiamondLoupeFacet.facets.selector;
        functionSelectors[2] = DiamondLoupeFacet.facetAddress.selector;
        functionSelectors[3] = DiamondLoupeFacet.facetAddresses.selector;
        functionSelectors[4] = DiamondLoupeFacet.supportsInterface.selector;
        _builtinDiamondCut.push(IDiamondCut.FacetCut({
            facetAddress:address(diamondLoupeFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        }));


        // -------------------------------------------------------------------------
        // adding ownership functions
        // -------------------------------------------------------------------------
        OwnershipFacet ownershipFacet = new OwnershipFacet();

        functionSelectors = new bytes4[](2);
        functionSelectors[0] = OwnershipFacet.transferOwnership.selector;
        functionSelectors[1] = OwnershipFacet.owner.selector;
        _builtinDiamondCut.push(IDiamondCut.FacetCut({
            facetAddress:address(ownershipFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        }));
    }

    function createDiamond(
        address owner,
        IDiamondCut.FacetCut[] calldata _diamondCut,
        bytes calldata data,
        bytes32 salt
    ) external payable returns (Diamond diamond) {
        if (salt != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            salt = keccak256(abi.encodePacked(salt, owner));
            diamond = new Diamond{value: msg.value, salt: salt}(
                _builtinDiamondCut,
                Diamond.DiamondArgs({owner:address(this)})
            );
        } else {
            diamond = new Diamond{value: msg.value}(_builtinDiamondCut, Diamond.DiamondArgs({owner:address(this)}));
        }
        emit DiamondCreated(diamond);

        IDiamondCut(address(diamond)).diamondCut(_diamondCut, data.length > 0 ? address(diamond) : address(0), data);
        IERC173(address(diamond)).transferOwnership(owner);
    }
}
