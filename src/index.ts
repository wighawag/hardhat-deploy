import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import {
  extendEnvironment,
  internalTask,
  task
} from "@nomiclabs/buidler/config";
import { BuidlerError } from "@nomiclabs/buidler/internal//core/errors";
import {
  JsonRpcServer,
  JsonRpcServerConfig
} from "@nomiclabs/buidler/internal/buidler-evm/jsonrpc/server";
import { BUIDLEREVM_NETWORK_NAME } from "@nomiclabs/buidler/internal/constants";
import { ERRORS } from "@nomiclabs/buidler/internal/core/errors-list";
import chalk from "chalk";
// import { TASK_NODE } from "./task-names";
const TASK_NODE = "node";
import debug from "debug";
const log = debug("buidler:wighawag:buidler-deploy");

import { DeploymentsManager } from "./DeploymentsManager";

const { getChainId } = require("./utils");

function fixProvider(env: BuidlerRuntimeEnvironment) {
  // alow it to be used by ethers without any change
  const provider = env.ethereum as any;
  if (provider.sendAsync === undefined) {
    provider.sendAsync = async (
      req: {
        id: number;
        jsonrpc: string;
        method: string;
        params: any[];
      },
      callback: (error: any, result: any) => void
    ) => {
      let result;
      try {
        result = await provider.send(req.method, req.params);
      } catch (e) {
        callback(e, null);
        return;
      }
      const response = { result, id: req.id, jsonrpc: req.jsonrpc };
      callback(null, response);
    };
  }
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
    // console.log({
    //   envChainId: process.env.BUIDLER__DEPLOY_PLUGIN_CHAIN_ID,
    //   envAccounts: process.env.BUIDLER__DEPLOY_PLUGIN_ACCOUNTS,
    // });
    log("ensuring provider work with ethers");
    fixProvider(env);
    if (deploymentsManager === undefined || env.deployments === undefined) {
      deploymentsManager = new DeploymentsManager(env);
      env.deployments = deploymentsManager.deploymentsExtension;
      env.getNamedAccounts = deploymentsManager.getNamedAccounts.bind(
        deploymentsManager
      );
    }
    log("ready");
  });

  internalTask("_resolveNamedAccounts", "resolve named accounts", async () => {
    return deploymentsManager.addNamedAccounts();
  });

  internalTask("deploy:loadDeployments", "load existing deployments").setAction(
    async () => {
      await deploymentsManager.loadDeployments();
    }
  );

  internalTask("deploy:runDeploy", "execute the deployment scripts")
    .addOptionalParam("export", "export current network deployments")
    .addOptionalParam("exportAll", "export all deployments into one file")
    .addOptionalParam("tags", "dependencies to run")
    .addOptionalParam("node", "specify node to connect to")
    .setAction(async args => {
      return deploymentsManager.runDeploy(args.tags, {
        reset: false,
        noSaving: false,
        export: args.export,
        exportAll: args.exportAll
      });
    });

  task("deploy", "Deploy contracts")
    .addOptionalParam("export", "export current network deployments")
    .addOptionalParam("exportAll", "export all deployments into one file")
    .setAction(async (args, bre) => {
      await bre.run("compile");
      await bre.run("deploy:runDeploy", args);
    });

  task("compile").setAction(async (args, bre, runSuper) => {
    await bre.run("_resolveNamedAccounts");
    await bre.run("deploy:loadDeployments");
    await runSuper(args);
  });

  task("run").setAction(async (args, bre, runSuper) => {
    const chainId = await getChainId(bre);
    // console.log('run chainId ', chainId);
    (bre.buidlerArguments as any)._deployPluginChainId = chainId;
    // TODO add argument to deploy too (useful for testing script on buidlerevm)
    // this will then set an flag on buidlerArguments so when run execute the script, the env can be fetched to check if deploy need to run
    // Note this won't run now as run execute the buidler env twice currently
    const accounts = await bre.ethereum.send("eth_accounts");
    if (accounts.length > 0) {
      (bre.buidlerArguments as any)._deployPluginAccounts = accounts.join(".");
    }
    await runSuper(args);
  });

  task("listen")
    .addOptionalParam("export", "export current network deployments")
    .addOptionalParam("exportAll", "export all deployments into one file")
    .addOptionalParam("hostname")
    .addOptionalParam("port")
    .setAction(async (args, bre) => {
      await bre.run("deploy", args);
      await bre.run("node", {
        ...args,
        hostname: args.hostname || "localhost",
        port: args.ports || 8545
      });
    });

  task(TASK_NODE, "Starts a JSON-RPC server on top of Buidler EVM").setAction(
    async (
      { hostname, port },
      { network, buidlerArguments, config, ethereum }
    ) => {
      // if (
      //   network.name !== BUIDLEREVM_NETWORK_NAME &&
      //   // We normally set the default network as buidlerArguments.network,
      //   // so this check isn't enough, and we add the next one. This has the
      //   // effect of `--network <defaultNetwork>` being a false negative, but
      //   // not a big deal.
      //   buidlerArguments.network !== undefined &&
      //   buidlerArguments.network !== config.defaultNetwork
      // ) {
      //   throw new BuidlerError(
      //     ERRORS.BUILTIN_TASKS.JSONRPC_UNSUPPORTED_NETWORK
      //   );
      // }

      try {
        const serverConfig = {
          hostname,
          port,
          provider: ethereum
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
    }
  );
}
