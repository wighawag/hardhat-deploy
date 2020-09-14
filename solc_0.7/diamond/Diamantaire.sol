// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "./interfaces/IDiamondCut.sol";
import "./Diamond.sol";

contract Diamantaire {
    event DiamondCreated(Diamond diamond);

    function createDiamond(
        address owner,
        IDiamondCut.Facet[] calldata _diamondCut,
        bytes calldata data
    ) external payable {
        Diamond diamond = new Diamond{value: msg.value}(address(this));
        emit DiamondCreated(diamond);

        IDiamondCut(address(diamond)).diamondCut(
            _diamondCut,
            data.length > 0 ? address(diamond) : address(0),
            data
        );
        IERC173(address(diamond)).transferOwnership(owner);
    }
}
