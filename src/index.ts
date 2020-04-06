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

import { DeploymentsManager } from "./DeploymentsManager";
const { addNamedAccounts, getChainId } = require("./utils");

export default function() {
  let deploymentsManager: DeploymentsManager;
  extendEnvironment(env => {
    if (deploymentsManager === undefined || env.deployments === undefined) {
      deploymentsManager = new DeploymentsManager(env);
      env.deployments = deploymentsManager.deploymentsExtension;
      env.namedAccounts = {};
    }
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
    .addOptionalParam("export", "export deployment info into one file")
    .addOptionalParam("tags", "dependencies to run")
    .addOptionalParam("node", "specify node to connect to")
    .setAction(async args => {
      return deploymentsManager.runDeploy(args.tags, {
        reset: true,
        noSaving: false
      });
    });

  task("deploy", "Deploy contracts")
    .addOptionalParam("export", "export deployment info into one file")
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
    const accounts = await bre.ethereum.send("eth_accounts");
    if (accounts.length > 0) {
      (bre.buidlerArguments as any)._deployPluginAccounts = accounts.join(".");
    }
    await runSuper(args);
  });

  task("listen")
    .addOptionalParam("export", "export deployment info into one file")
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
