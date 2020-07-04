pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "./DiamondHeaders.sol";
import "./DiamondBase.sol";

contract Diamantaire {
    address immutable _admin;

    constructor(address admin) public {
        _admin = admin;
    }

    function createDiamond(bytes[] memory _diamondCut, bytes memory data)
        public
        returns (Diamond diamond)
    {
        diamond = Diamond(address(new DiamondBase(address(this))));
        if (_diamondCut.length > 0) {
            cut(diamond, _diamondCut);
        }
        if (data.length > 0) {
            execute(diamond, data);
        }
    }

    function cut(Diamond diamond, bytes[] memory _diamondCut) public {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        diamond.diamondCut(_diamondCut);
    }

    function execute(Diamond diamond, bytes memory data) public payable {
        (bool success, ) = address(diamond).call{value: msg.value}(data);
        if (!success) {
            // solhint-disable-next-line security/no-inline-assembly
            assembly {
                let returnDataSize := returndatasize()
                returndatacopy(0, 0, returnDataSize)
                revert(0, returnDataSize)
            }
        }
    }

    function cutAndExecute(
        Diamond diamond,
        bytes[] memory _diamondCut,
        bytes memory data
    ) public payable {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        cut(diamond, _diamondCut);
        execute(diamond, data);
    }
}
