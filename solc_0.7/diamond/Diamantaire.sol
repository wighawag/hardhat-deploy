// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./DiamondHeaders.sol";
import "./Diamond.sol";

contract Diamantaire {
    event DiamondCreated(IDiamond diamond);

    function createDiamond(
        address owner,
        bytes[] calldata _diamondCut,
        bytes calldata data
    ) external payable {
        IDiamond diamond = IDiamond(
            address(new Diamond{value: msg.value}(owner))
        );
        emit DiamondCreated(diamond);

        diamond.diamondCut(_diamondCut, address(0), data);
    }
}
