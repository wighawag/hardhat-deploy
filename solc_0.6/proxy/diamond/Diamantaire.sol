pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "./DiamondHeaders.sol";
import "./DiamondBase.sol";
import "./ERC173.sol";

contract Diamantaire is ERC173 {
    event DiamondCreated(Diamond diamond);

    address _owner;
    Diamond _diamond;

    constructor(
        address owner,
        bytes[] memory _diamondCut,
        bytes memory data
    ) public payable {
        _owner = owner;
        Diamond diamond = Diamond(address(new DiamondBase(address(this))));
        emit DiamondCreated(diamond);
        _diamond = diamond;

        if (_diamondCut.length > 0) {
            _cut(diamond, _diamondCut);
        }
        if (data.length > 0) {
            _execute(diamond, msg.value, data);
        }
    }

    function transferOwnership(address newOwner) external override {
        address previousOwner = _owner;
        require(msg.sender == previousOwner, "NOT_AUTHORIZED");
        _owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function owner() external override view returns (address) {
        return _owner;
    }

    function cutAndExecute(bytes[] memory _diamondCut, bytes memory data)
        public
        payable
    {
        require(msg.sender == _owner, "NOT_AUTHORIZED");
        Diamond diamond = _diamond;
        if (_diamondCut.length > 0) {
            _cut(diamond, _diamondCut);
        }
        if (data.length > 0) {
            _execute(diamond, msg.value, data);
        }
    }

    // ///////////////////// EXTERNAL ///////////////////////////////////////////////////////////////////////////

    receive() external payable {
        _fallback();
    }

    fallback() external payable {
        _fallback();
    }

    // ///////////////////////// INTERNALS //////////////////////////////////////////////////////////////////////

    function _fallback() internal {
        require(msg.sender == _owner, "NOT_AUTHORIZED");
        address target = address(_diamond);
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            calldatacopy(0x0, 0x0, calldatasize())
            let success := call(
                gas(),
                target,
                callvalue(),
                0x0,
                calldatasize(),
                0,
                0
            )
            let retSz := returndatasize()
            returndatacopy(0, 0, retSz)
            switch success
                case 0 {
                    revert(0, retSz)
                }
                default {
                    return(0, retSz)
                }
        }
    }

    function _cut(Diamond diamond, bytes[] memory _diamondCut) internal {
        diamond.diamondCut(_diamondCut);
    }

    function _execute(
        Diamond diamond,
        uint256 value,
        bytes memory data
    ) internal {
        (bool success, ) = address(diamond).call{value: value}(data);
        if (!success) {
            // solhint-disable-next-line security/no-inline-assembly
            assembly {
                let returnDataSize := returndatasize()
                returndatacopy(0, 0, returnDataSize)
                revert(0, returnDataSize)
            }
        }
    }
}
