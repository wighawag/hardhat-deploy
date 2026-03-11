// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Router for at max 10 Implementations and 60 function selectors
/// @author Ronan Sandford
/// @notice Create an immutable route and delegate function call to their respective implementations
contract Router10X60 {
	address internal immutable implementation_00;
	address internal immutable implementation_01;
	address internal immutable implementation_02;
	address internal immutable implementation_03;
	address internal immutable implementation_04;
	address internal immutable implementation_05;
	address internal immutable implementation_06;
	address internal immutable implementation_07;
	address internal immutable implementation_08;
	address internal immutable implementation_09;

	address internal immutable fallback_implementation;

	uint256 internal immutable sigs_00;
	uint256 internal immutable sigs_01;
	uint256 internal immutable sigs_02;
	uint256 internal immutable sigs_03;
	uint256 internal immutable sigs_04;
	uint256 internal immutable sigs_05;
	uint256 internal immutable sigs_06;
	uint256 internal immutable sigs_07;
	uint256 internal immutable sigs_08;
	uint256 internal immutable sigs_09;

	uint256 internal immutable sigs_count;

	// This is the interface for routes specification
	struct Routes {
		address[] implementations;
		/// The sigmap is represented as an array of entry
		// each entry is 5 bytes
		/// the upmost bytes are the bytes4 function selector
		// the lowest byte represent the index in the implementation's address array provided aling
		// This measn there is at max 256 implementation possible
		// The entry needs to be ordered so binary search can be executed on them
		bytes5[] sigMap;
		address fallbackImplementation;
	}

	/// @notice This Router implementation only support at max 10 implementations and 60 function selectors
	/// @param routes define the routing 
	///  each selector is represented by a bytes5, where the upper most bytes4 is the selector and 
	///  the lowest bytes represent the index of the implementations
	///  implementations' addresses are given in an array
	constructor(Routes memory routes) {
		uint256 numSigs = routes.sigMap.length;
		uint256 numImpl = routes.implementations.length;
		require(numImpl <= 10, 'MAX_IMPLEMENTATIONS_REACHED');
		require(numSigs <= 60, 'MAX_SIGS_REACHED');

		{
			address tmp_implementation_00 = routes.implementations[0];
			address tmp_implementation_01;
			address tmp_implementation_02;
			address tmp_implementation_03;
			address tmp_implementation_04;
			address tmp_implementation_05;
			address tmp_implementation_06;
			address tmp_implementation_07;
			address tmp_implementation_08;
			address tmp_implementation_09;
			if (numImpl > 1) {
				tmp_implementation_01 = routes.implementations[1];
			}
			if (numImpl > 2) {
				tmp_implementation_02 = routes.implementations[2];
			}
			if (numImpl > 3) {
				tmp_implementation_03 = routes.implementations[3];
			}
			if (numImpl > 4) {
				tmp_implementation_04 = routes.implementations[4];
			}
			if (numImpl > 5) {
				tmp_implementation_05 = routes.implementations[5];
			}
			if (numImpl > 6) {
				tmp_implementation_06 = routes.implementations[6];
			}
			if (numImpl > 7) {
				tmp_implementation_07 = routes.implementations[7];
			}
			if (numImpl > 8) {
				tmp_implementation_08 = routes.implementations[8];
			}
			if (numImpl > 9) {
				tmp_implementation_09 = routes.implementations[9];
			}

			implementation_00 = tmp_implementation_00;
			implementation_01 = tmp_implementation_01;
			implementation_02 = tmp_implementation_02;
			implementation_03 = tmp_implementation_03;
			implementation_04 = tmp_implementation_04;
			implementation_05 = tmp_implementation_05;
			implementation_06 = tmp_implementation_06;
			implementation_07 = tmp_implementation_07;
			implementation_08 = tmp_implementation_08;
			implementation_09 = tmp_implementation_09;
		}

		{
			uint256 tmp_sigs_00;
			uint256 tmp_sigs_01;
			uint256 tmp_sigs_02;
			uint256 tmp_sigs_03;
			uint256 tmp_sigs_04;
			uint256 tmp_sigs_05;
			uint256 tmp_sigs_06;
			uint256 tmp_sigs_07;
			uint256 tmp_sigs_08;
			uint256 tmp_sigs_09;
			
			uint256 lastSig;
			for (uint256 i = 0; i < numSigs; i++) {
				uint256 pair = uint256(uint40(routes.sigMap[i]));
				uint32 sig = uint32(pair >> 8);
				require(lastSig < sig, "NOT_IN_ORDER");
				lastSig = sig;
				if (i < 6) {
					tmp_sigs_00 = tmp_sigs_00 | (pair << (i * 40));
				} else if (i < 12) {
					tmp_sigs_01 = tmp_sigs_01 | (pair << ((i - 6) * 40));
				} else if (i < 18) {
					tmp_sigs_02 = tmp_sigs_02 | (pair << ((i - 12) * 40));
				} else if (i < 24) {
					tmp_sigs_03 = tmp_sigs_03 | (pair << ((i - 18) * 40));
				} else if (i < 30) {
					tmp_sigs_04 = tmp_sigs_04 | (pair << ((i - 24) * 40));
				} else if (i < 36) {
					tmp_sigs_05 = tmp_sigs_05 | (pair << ((i - 30) * 40));
				} else if (i < 42) {
					tmp_sigs_06 = tmp_sigs_06 | (pair << ((i - 36) * 40));
				} else if (i < 48) {
					tmp_sigs_07 = tmp_sigs_07 | (pair << ((i - 42) * 40));
				} else if (i < 54) {
					tmp_sigs_07 = tmp_sigs_08 | (pair << ((i - 48) * 40));
				} else {
					tmp_sigs_07 = tmp_sigs_09 | (pair << ((i - 54) * 40));
				}
			}
			sigs_00 = tmp_sigs_00;
			sigs_01 = tmp_sigs_01;
			sigs_02 = tmp_sigs_02;
			sigs_03 = tmp_sigs_03;
			sigs_04 = tmp_sigs_04;
			sigs_05 = tmp_sigs_05;
			sigs_06 = tmp_sigs_06;
			sigs_07 = tmp_sigs_07;
			sigs_08 = tmp_sigs_08;
			sigs_09 = tmp_sigs_09;

			sigs_count = numSigs;
		}

		fallback_implementation = routes.fallbackImplementation;
	}

	fallback() external payable {
		uint32 sig = uint32(msg.sig);
		uint256 implementationIndex;
		uint256 left = 0;
    	uint256 right = sigs_count - 1;
		while (left <= right) {
			uint256 i = (left + right) / 2;
			uint40 pair;
			if (i < 6) {
				pair = uint40((sigs_00 >> (i * 40)) & 0xFFFFFFFFFF);
			} else if (i < 12) {
				pair = uint40((sigs_01 >> ((i - 6) * 40)) & 0xFFFFFFFFFF);
			} else if (i < 18) {
				pair = uint40((sigs_02 >> ((i - 12) * 40)) & 0xFFFFFFFFFF);
			} else if (i < 24) {
				pair = uint40((sigs_03 >> ((i - 18) * 40)) & 0xFFFFFFFFFF);
			} else if (i < 30) {
				pair = uint40((sigs_04 >> ((i - 24) * 40)) & 0xFFFFFFFFFF);
			} else if (i < 36) {
				pair = uint40((sigs_05 >> ((i - 30) * 40)) & 0xFFFFFFFFFF);
			} else if (i < 42) {
				pair = uint40((sigs_06 >> ((i - 36) * 40)) & 0xFFFFFFFFFF);
			}  else if (i < 48) {
				pair = uint40((sigs_07 >> ((i - 42) * 40)) & 0xFFFFFFFFFF);
			}  else if (i < 54) {
				pair = uint40((sigs_08 >> ((i - 48) * 40)) & 0xFFFFFFFFFF);
			}  else {
				pair = uint40((sigs_09 >> ((i - 54) * 40)) & 0xFFFFFFFFFF);
			}
			uint32 value = uint32(pair >> 8);
			if (value > sig) {
				right = i -1;
			} else if (value < sig) {
				left = i + 1;
			} else {
				implementationIndex = uint256(pair & 0xFF) + 1;
				break;
			}
		}

		address implementation;
		if (implementationIndex == 1) {
			implementation = implementation_00;
		} else if (implementationIndex == 2) {
			implementation = implementation_01;
		} else if (implementationIndex == 3) {
			implementation = implementation_02;
		} else if (implementationIndex == 4) {
			implementation = implementation_03;
		} else if (implementationIndex == 5) {
			implementation = implementation_04;
		} else if (implementationIndex == 6) {
			implementation = implementation_05;
		} else if (implementationIndex == 7) {
			implementation = implementation_06;
		} else if (implementationIndex == 8) {
			implementation = implementation_07;
		} else if (implementationIndex == 9) {
			implementation = implementation_08;
		} else if (implementationIndex == 10) {
			implementation = implementation_09;
		} else {
			implementation = fallback_implementation;
		}

		require(implementation != address(0), 'UNKNOWN_METHOD');

		// taken from https://github.com/OpenZeppelin/openzeppelin-contracts/blob/8cab922347e79732f6a532a75da5081ba7447a71/contracts/proxy/Proxy.sol#L22-L45
		assembly {
			// Copy msg.data. We take full control of memory in this inline assembly
			// block because it will not return to Solidity code. We overwrite the
			// Solidity scratch pad at memory position 0.
			calldatacopy(0, 0, calldatasize())

			// Call the implementation.
			// out and outsize are 0 because we don't know the size yet.
			let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)

			// Copy the returned data.
			returndatacopy(0, 0, returndatasize())

			switch result
			// delegatecall returns 0 on error.
			case 0 {
				revert(0, returndatasize())
			}
			default {
				return(0, returndatasize())
			}
		}
	}
}
