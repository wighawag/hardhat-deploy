import {
  BuidlerNetworkConfig,
  EthereumProvider,
  ResolvedBuidlerConfig,
  BuidlerRuntimeEnvironment
} from "@nomiclabs/buidler/types";
import { createProvider } from "@nomiclabs/buidler/internal/core/providers/construction";
import { lazyObject } from "@nomiclabs/buidler/internal/util/lazy";
import {
  extendEnvironment,
  task,
  internalTask
} from "@nomiclabs/buidler/config";
import { BuidlerError } from "@nomiclabs/buidler/internal//core/errors";
import {
  JsonRpcServer,
  JsonRpcServerConfig
} from "@nomiclabs/buidler/internal/buidler-evm/jsonrpc/server";
import { BUIDLEREVM_NETWORK_NAME } from "@nomiclabs/buidler/internal/constants";
import * as types from "@nomiclabs/buidler/internal/core/params/argumentTypes";
import { ERRORS } from "@nomiclabs/buidler/internal/core/errors-list";
import chalk from "chalk";
import {
  TASK_NODE,
  TASK_COMPILE_GET_COMPILER_INPUT
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import debug from "debug";
const log = debug("buidler:wighawag:buidler-deploy");

import { DeploymentsManager } from "./DeploymentsManager";

function isBuidlerEVM(bre: BuidlerRuntimeEnvironment): boolean {
  const { network, buidlerArguments, config } = bre;
  return !(
    network.name !== BUIDLEREVM_NETWORK_NAME &&
    // We normally set the default network as buidlerArguments.network,
    // so this check isn't enough, and we add the next one. This has the
    // effect of `--network <defaultNetwork>` being a false negative, but
    // not a big deal.
    buidlerArguments.network !== undefined &&
    buidlerArguments.network !== config.defaultNetwork
  );
}

export default function() {
  log("start...");
  let deploymentsManager: DeploymentsManager;
  extendEnvironment(env => {
    let live = true;
    if (env.network.name === "localhost" || env.network.name === "buidlerevm") {
      // the 2 default network are not live network
      live = false;
    }
    if (env.network.config.live !== undefined) {
      live = env.network.config.live;
    }
    env.network.live = live;

    if (env.network.config.saveDeployments === undefined) {
      env.network.saveDeployments = true; // always save (unless fixture or test? env.network.live;
    } else {
      env.network.saveDeployments = env.network.config.saveDeployments;
    }

    if (deploymentsManager === undefined || env.deployments === undefined) {
      deploymentsManager = new DeploymentsManager(env);
      env.deployments = deploymentsManager.deploymentsExtension;
      env.getNamedAccounts = deploymentsManager.getNamedAccounts.bind(
        deploymentsManager
      );
    }
    log("ready");
  });

  function addIfNotPresent(array: string[], value: string) {
    if (array.indexOf(value) === -1) {
      array.push(value);
    }
  }

  function setupExtraSolcSettings(settings: {
    metadata: { useLiteralContent: boolean };
    outputSelection: { "*": { "": string[]; "*": string[] } };
  }): void {
    settings.metadata = settings.metadata || {};
    settings.metadata.useLiteralContent = true;

    if (settings.outputSelection === undefined) {
      settings.outputSelection = {
        "*": {
          "*": [],
          "": []
        }
      };
    }
    if (settings.outputSelection["*"] === undefined) {
      settings.outputSelection["*"] = {
        "*": [],
        "": []
      };
    }
    if (settings.outputSelection["*"]["*"] === undefined) {
      settings.outputSelection["*"]["*"] = [];
    }
    if (settings.outputSelection["*"][""] === undefined) {
      settings.outputSelection["*"][""] = [];
    }

    addIfNotPresent(settings.outputSelection["*"]["*"], "abi");
    addIfNotPresent(settings.outputSelection["*"]["*"], "evm.bytecode");
    addIfNotPresent(settings.outputSelection["*"]["*"], "evm.deployedBytecode");
    addIfNotPresent(settings.outputSelection["*"]["*"], "metadata");
    addIfNotPresent(settings.outputSelection["*"]["*"], "devdoc");
    addIfNotPresent(settings.outputSelection["*"]["*"], "userdoc");
    addIfNotPresent(settings.outputSelection["*"]["*"], "storageLayout");
    addIfNotPresent(
      settings.outputSelection["*"]["*"],
      "evm.methodIdentifiers"
    );
    addIfNotPresent(settings.outputSelection["*"][""], "id");
    addIfNotPresent(settings.outputSelection["*"][""], "ast");
  }

  internalTask(TASK_COMPILE_GET_COMPILER_INPUT).setAction(
    async (_, __, runSuper) => {
      const input = await runSuper();
      setupExtraSolcSettings(input.settings);

      return input;
    }
  );

  internalTask("deploy:run", "deploy ")
    .addOptionalParam("export", "export current network deployments")
    .addOptionalParam("exportAll", "export all deployments into one file")
    .addOptionalParam("tags", "dependencies to run")
    .addOptionalParam(
      "write",
      "whether to write deployments to file",
      true,
      types.boolean
    )
    .addOptionalParam(
      "reset",
      "whether to delete deployments files first",
      false,
      types.boolean
    )
    .addOptionalParam("log", "whether to output log", false, types.boolean)
    .addOptionalParam(
      "pendingtx",
      "whether to save pending tx",
      false,
      types.boolean
    )
    .addOptionalParam(
      "gasprice",
      "gas price to use for transactions",
      undefined,
      types.string
    )
    .setAction(async (args, bre) => {
      await bre.run("compile");
      return deploymentsManager.runDeploy(args.tags, {
        log: args.log,
        resetMemory: false, // this is memory reset, TODO rename it
        deletePreviousDeployments: args.reset,
        writeDeploymentsToFiles: args.write,
        export: args.export,
        exportAll: args.exportAll,
        savePendingTx: args.pendingtx,
        gasPrice: args.gasprice
      });
    });

  task("deploy", "Deploy contracts")
    .addOptionalParam("export", "export current network deployments")
    .addOptionalParam("exportAll", "export all deployments into one file")
    .addOptionalParam("tags", "dependencies to run")
    .addOptionalParam(
      "write",
      "whether to write deployments to file",
      undefined,
      types.boolean
    )
    .addOptionalParam(
      "reset",
      "whether to delete deployments files first",
      false,
      types.boolean
    )
    .addOptionalParam("log", "whether to output log", true, types.boolean)
    .addOptionalParam(
      "gasprice",
      "gas price to use for transactions",
      undefined,
      types.string
    )
    .setAction(async (args, bre) => {
      if (args.write === undefined) {
        args.write = !isBuidlerEVM(bre);
      }
      args.pendingtx = !isBuidlerEVM(bre);
      await bre.run("deploy:run", args);
    });

  // TODO
  // task(
  //   "export",
  //   "export contract deployment of the specified network into one file"
  // )
  //   .addOptionalParam("all", "export all deployments into one file")
  //   .setAction(async (args, bre) => {

  //   });

  function _createBuidlerEVMProvider(
    config: ResolvedBuidlerConfig
  ): EthereumProvider {
    log("Creating BuidlerEVM Provider");

    const networkName = BUIDLEREVM_NETWORK_NAME;
    const networkConfig = config.networks[networkName] as BuidlerNetworkConfig;

    return lazyObject(() => {
      log(`Creating buidlerevm provider for JSON-RPC sever`);
      return createProvider(
        networkName,
        { loggingEnabled: true, ...networkConfig },
        config.solc.version,
        config.paths
      );
    });
  }

  task(TASK_NODE, "Starts a JSON-RPC server on top of Buidler EVM")
    .addOptionalParam("export", "export current network deployments")
    .addOptionalParam("exportAll", "export all deployments into one file")
    .addOptionalParam("tags", "dependencies to run")
    .addOptionalParam(
      "write",
      "whether to write deployments to file",
      true,
      types.boolean
    )
    .addOptionalParam(
      "reset",
      "whether to delete deployments files first",
      true,
      types.boolean
    )
    .addOptionalParam("log", "whether to output log", true, types.boolean)
    .setAction(async (args, bre, runSuper) => {
      args.pendingtx = !isBuidlerEVM(bre);
      // TODO return runSuper(args); and remove the rest (used for now to remove login privateKeys)
      if (!isBuidlerEVM(bre)) {
        throw new BuidlerError(
          ERRORS.BUILTIN_TASKS.JSONRPC_UNSUPPORTED_NETWORK
        );
      }
      bre.network.name = "localhost"; // Ensure deployments can be fetched with console
      await bre.run("deploy:run", args);
      const { hostname, port } = args;
      try {
        const serverConfig: JsonRpcServerConfig = {
          hostname,
          port,
          provider: bre.network.provider
        };

        const server = new JsonRpcServer(serverConfig);

        const { port: actualPort, address } = await server.listen();

        console.log(
          chalk.green(
            `Started HTTP and WebSocket JSON-RPC server at http://${address}:${actualPort}/`
          )
        );

        await server.waitUntilClosed();
      } catch (error) {
        if (BuidlerError.isBuidlerError(error)) {
          throw error;
        }

        throw new BuidlerError(
          ERRORS.BUILTIN_TASKS.JSONRPC_SERVER_ERROR,
          {
            error: error.message
          },
          error
        );
      }
    });
}
