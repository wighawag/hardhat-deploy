// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC173Proxy.sol";

///@notice Proxy implementing ERC173 for ownership management that accept ETH via receive
contract ERC173ProxyWithReceive is ERC173Proxy {
    constructor(address implementationAddress, address ownerAddress, bytes memory data)
        payable
        ERC173Proxy(implementationAddress, ownerAddress, data)
    {}

    receive() external payable override {}
}
