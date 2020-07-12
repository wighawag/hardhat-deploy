import {
  BuidlerNetworkConfig,
  EthereumProvider,
  ResolvedBuidlerConfig,
  BuidlerRuntimeEnvironment,
  Deployment
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
// import { TASK_NODE } from "./task-names";
const TASK_NODE = "node";
import debug from "debug";
const log = debug("buidler:wighawag:buidler-deploy");

import { DeploymentsManager } from "./DeploymentsManager";
import chokidar from "chokidar";

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
    .addFlag("reset", "whether to delete deployments files first")
    .addFlag("log", "whether to output log")
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
    .addFlag("watch", "redeploy on every change of contract or deploy script")
    .setAction(async (args, bre) => {
      async function compileAndDeploy() {
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
      }

      let currentPromise: Promise<{
        [name: string]: Deployment;
      }> | null = compileAndDeploy();
      if (args.watch) {
        const watcher = chokidar.watch(
          [
            bre.config.paths.sources,
            bre.config.paths.deploy || bre.config.paths.root + "/deploy"
          ],
          {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
          }
        );

        watcher.on("ready", () =>
          console.log("Initial scan complete. Ready for changes")
        );

        let rejectPending: any = null;
        function pending(): Promise<any> {
          return new Promise((resolve, reject) => {
            rejectPending = reject;
            if (currentPromise) {
              currentPromise
                .then(() => {
                  rejectPending = null;
                  resolve();
                })
                .catch(error => {
                  rejectPending = null;
                  currentPromise = null;
                  console.error(error);
                });
            } else {
              rejectPending = null;
              resolve();
            }
          });
        }
        watcher.on("change", async (path, stats) => {
          console.log("change detected");
          if (currentPromise) {
            console.log("deployment in progress, please wait ...");
            if (rejectPending) {
              // console.log("disabling previously pending redeployments...");
              rejectPending();
            }
            try {
              // console.log("waiting for current redeployment...");
              await pending();
              // console.log("pending finished");
            } catch (e) {
              return;
            }
          }
          currentPromise = compileAndDeploy();
          try {
            await currentPromise;
          } catch (e) {
            console.error(e);
          }
          currentPromise = null;
        });
        try {
          await currentPromise;
        } catch (e) {
          console.error(e);
        }
        currentPromise = null;
        await new Promise(resolve => setTimeout(resolve, 2000000000)); // TODO better way ?
      } else {
        const firstDeployments = await currentPromise;
        return firstDeployments;
      }
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
    .addFlag("reset", "whether to delete deployments files first")
    .addFlag("log", "whether to output log")
    .addOptionalParam(
      "gasprice",
      "gas price to use for transactions",
      undefined,
      types.string
    )
    .addFlag("watch", "redeploy on every change of contract or deploy script")
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
    .addFlag("reset", "whether to delete deployments files first")
    .addFlag("log", "whether to output log")
    .addFlag("watch", "redeploy on every change of contract or deploy script")
    .setAction(async (args, bre, runSuper) => {
      args.pendingtx = !isBuidlerEVM(bre);

      // TODO return runSuper(args); and remove the rest (used for now to remove login privateKeys)
      if (!isBuidlerEVM(bre)) {
        throw new BuidlerError(
          ERRORS.BUILTIN_TASKS.JSONRPC_UNSUPPORTED_NETWORK
        );
      }

      let server;
      const { hostname, port } = args;
      try {
        const serverConfig: JsonRpcServerConfig = {
          hostname,
          port,
          provider: _createBuidlerEVMProvider(bre.config)
        };

        server = new JsonRpcServer(serverConfig);

        const { port: actualPort, address } = await server.listen();

        console.log(
          chalk.green(
            `Started HTTP and WebSocket JSON-RPC server at http://${address}:${actualPort}/`
          )
        );
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
      await bre.run("deploy:run", args);
      await server.waitUntilClosed();
    });
}
