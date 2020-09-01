// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract Proxiable {
    // ////////////////////////// EVENTS ///////////////////////////////////////////////////////////////////////

    event ProxyAdmin(address adminAddress);
    event ProxyImplementation(address implementationContractAddress);

    // ///////////////////////////// EXTERNAL //////////////////////////////////////////////////////////

    function changeImplementation(
        address newImplementation,
        bytes calldata data
    ) external {
        require(_admin() == msg.sender, "not admin");
        require(
            bytes32(
                0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
            ) == Proxiable(newImplementation).proxiableUUID(),
            "Not compatible"
        );

        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            sstore(
                0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc,
                newImplementation
            )
        }

        (bool success, ) = newImplementation.delegatecall(data);
        require(success, "Upgrade failed");
        emit ProxyImplementation(newImplementation);
    }

    function changeAdmin(address newAdmin) external {
        require(_admin() == msg.sender, "not admin");
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            sstore(
                0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103,
                newAdmin
            )
        }
        emit ProxyAdmin(newAdmin);
    }

    function proxiableUUID() external pure returns (bytes32) {
        return
            0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    }

    function admin() external view returns (address) {
        return _admin();
    }

    // /////////////////////////////// INTERNAL //////////////////////////////////////////////////////////

    function _admin() internal view returns (address adminAddress) {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            adminAddress := sload(
                0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
            )
        }
    }
}
