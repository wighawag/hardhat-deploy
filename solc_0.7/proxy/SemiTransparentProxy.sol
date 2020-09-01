// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "./Proxy.sol";

interface ERC165 {
    function supportsInterface(bytes4 id) external view returns (bool);
}

contract SemiTransparentProxy is Proxy {
    // ////////////////////////// EVENTS ///////////////////////////////////////////////////////////////////////

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // /////////////////////// CONSTRUCTOR //////////////////////////////////////////////////////////////////////

    constructor(
        address implementationAddress,
        bytes memory data,
        address ownerAddress
    ) {
        _setImplementation(implementationAddress, data);
        _setOwner(ownerAddress);
    }

    // ///////////////////// EXTERNAL ///////////////////////////////////////////////////////////////////////////

    function changeImplementation(
        address newImplementation,
        bytes calldata data
    ) external ifOwner {
        _setImplementation(newImplementation, data);
    }

    // TO FULFILL EIP-173 this function is not transparent
    // a clash would only have for consequences that a owner-clashing function in the implementation would have no effect except returning the owner address
    // while this could cause problem, it is unlikely to be caught by a test
    // Plus this contract is part of a tooling process that can check if two sig collide and prevent upgrade
    // We think this is better than having it return a different address than the actual owner for EIP-173 purpose
    // The only alternative would be to not implement EIP-173, including the use of different OwnerShip transfer event to not confuse potential listener
    function owner() external view returns (address) {
        return _owner();
    }

    // TO FULFILL EIP-173 this function is not transparent
    // Like above, as a read only function, the conseqeuences are minimal plus for this one, the call is made through in any case
    // while still ensuring it returns true for EIP-173 support
    function supportsInterface(bytes4 id) external view returns (bool) {
        if (id == 0x7f5828d0) {
            return true;
        }
        if (id == 0xFFFFFFFF) {
            return false;
        }

        ERC165 implementation;
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            implementation := sload(
                0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
            )
        }
        try implementation.supportsInterface(id) returns (bool support) {
            return support;
        } catch {
            return false;
        }
    }

    // Transfer of ownership on the other hand is only visible to the owner of the Proxy
    function transferOwnership(address newOwner) external ifOwner {
        _setOwner(newOwner);
    }

    // /////////////////////// MODIFIERS ////////////////////////////////////////////////////////////////////////

    modifier ifOwner() {
        if (msg.sender == _owner()) {
            _;
        } else {
            _fallback();
        }
    }

    // ///////////////////////// INTERNAL //////////////////////////////////////////////////////////////////////

    function _owner() internal view returns (address adminAddress) {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            adminAddress := sload(
                0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
            )
        }
    }

    function _setOwner(address newOwner) internal {
        address previousOwner = _owner();
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            sstore(
                0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103,
                newOwner
            )
        }
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
