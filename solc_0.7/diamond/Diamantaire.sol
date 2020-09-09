// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "./interfaces/IDiamondCut.sol";
import "./Diamond.sol";

contract Diamantaire {
    event DiamondCreated(Diamond diamond);

    function createDiamond(
        address owner,
        bytes[] calldata _diamondCut,
        bytes calldata data
    ) external payable {
        Diamond diamond = new Diamond{value: msg.value}(address(this));
        emit DiamondCreated(diamond);

        IDiamondCut(address(diamond)).diamondCut(_diamondCut, address(0), data);
        IERC173(address(diamond)).transferOwnership(owner);
    }
}
