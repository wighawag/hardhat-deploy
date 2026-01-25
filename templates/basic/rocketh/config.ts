/// ----------------------------------------------------------------------------
// Typed Config
// ----------------------------------------------------------------------------
import type { UserConfig } from "rocketh/types";


// we define our config and export it as "config"
export const config = {
    accounts: {
        deployer: {
            default: 0,
        },
        admin: {
            default: 1,
        },


    },
    data: {},

    // we also add here the public chain info for hardhat used for exports to frontend
    chains: {
        31337: {
            info: {
                id: 31337,
                name: "hardhat",
                nativeCurrency: {
                    name: "Ether",
                    symbol: "ETH",
                    decimals: 18
                },
                rpcUrls: {
                    default: {
                        http: ["http://127.0.0.1:8545"],
                    }
                }
            }
        }
    }
} as const satisfies UserConfig;

// then we import each extensions we are interested in using in our deploy script or elsewhere

// this one provide a deploy function
import * as deployExtension from "@rocketh/deploy";
// this one provide read,execute functions
import * as readExecuteExtension from "@rocketh/read-execute";
// this one provide a viem handle to clients and contracts
import * as viemExtension from '@rocketh/viem';

// and export them as a unified object
const extensions = {
    ...deployExtension,
    ...readExecuteExtension,
    ...viemExtension,
};
export { extensions };

// then we also export the types that our config ehibit so other can use it

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;

export type { Extensions, Accounts, Data };