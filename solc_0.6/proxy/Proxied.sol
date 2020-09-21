// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

abstract contract Proxied {
    modifier proxied() {
        address adminAddress = _admin();
        if (adminAddress == address(0)) {
            // ensure can not be called twice when used outside of proxy : no admin
            // solhint-disable-next-line security/no-inline-assembly
            assembly {
                sstore(
                    0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103,
                    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
                )
            }
        } else {
            require(msg.sender == adminAddress);
        }
        _;
    }

    modifier onlyProxyAdmin() {
        require(msg.sender == _admin(), "NOT_AUTHORIZED");
        _;
    }

    function _admin() internal view returns (address adminAddress) {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            adminAddress := sload(
                0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
            )
        }
    }
}
