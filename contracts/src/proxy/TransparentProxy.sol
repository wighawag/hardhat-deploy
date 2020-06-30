pragma solidity 0.6.5;

import "./Proxy.sol";

contract TransparentProxy is Proxy {
    // ////////////////////////// EVENTS ///////////////////////////////////////////////////////////////////////

    event ProxyAdmin(address adminAddress);
    event ProxyImplementation(address implementationContractAddress);

    // /////////////////////// CONSTRUCTOR //////////////////////////////////////////////////////////////////////

    constructor(
        address implementationAddress,
        bytes memory data,
        address adminAddress
    ) public Proxy(implementationAddress, data) {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            sstore(0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103, adminAddress)
        }
        emit ProxyImplementation(implementationAddress);
        emit ProxyAdmin(adminAddress);
    }

    // ///////////////////// EXTERNAL ///////////////////////////////////////////////////////////////////////////

    function changeImplementation(address newImplementation, bytes calldata data) external ifAdmin {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            sstore(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc, newImplementation)
        }

        (bool success, ) = newImplementation.delegatecall(data);
        if (!success) {
            assembly {
                // This assembly ensure the revert contains the exact string data
                let returnDataSize := returndatasize()
                returndatacopy(0, 0, returnDataSize)
                revert(0, returnDataSize)
            }
        }
        emit ProxyImplementation(newImplementation);
    }

    function admin() external ifAdmin returns (address) {
        return _admin();
    }

    function changeAdmin(address newAdmin) external ifAdmin {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            sstore(0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103, newAdmin)
        }
        emit ProxyAdmin(newAdmin);
    }

    // /////////////////////// MODIFIERS ////////////////////////////////////////////////////////////////////////

    modifier ifAdmin() {
        if (msg.sender == _admin()) {
            _;
        } else {
            _fallback();
        }
    }

    // ///////////////////////// INTERNAL //////////////////////////////////////////////////////////////////////

    function _admin() internal view returns (address adminAddress) {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            adminAddress := sload(0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103)
        }
    }
}
