import yargs from "yargs/yargs";
import { parse } from "shell-quote";
import { OrdersCommand } from "./orders";
import { MatrixService } from "../services/matrix-service";
import { FlatexService } from "../services/flatex-service";
import { SecuritiesCommand } from "./securities";
import { OrdersPlace } from "./orders-place";
import { OrdersCancel } from "./orders-cancel";
import {
    AvailableOrderTypes,
    LimitBuyOrder,
    LimitSellOrder,
    MarketBuyOrder,
    MarketSellOrder,
    OCOMarketSellOrder,
    StopMarketBuyOrder,
    StopMarketSellOrder
} from "../connectors/flatex-client/flatex-request";
import { pinResolver } from "../app";
import { getExchange } from "./shared";
import { DerivativeFinderCommand } from "./derivative-finder";
import { BalanceCommand } from "./balance";
import { AgentNewCommand } from "./agent-new";

export interface Command {
    // TODO: use some IoC, e.g. tsyringe
    run(flatex: FlatexService, matrix: MatrixService): Promise<void>;
}

export const parseInputAndExecuteCommands = async (input: string, flatex: FlatexService, matrix: MatrixService): Promise<void> => {
    const parsed = parse(input);
    const commands = [];
    while (parsed) {
        const idx = parsed.findIndex(e => typeof e !== "string");
        if (idx > 0) {
            commands.push(parsed.splice(0, idx) as string[]);
            const arg = parsed.splice(0, 1)[0];
            if (typeof arg !== "string") {
                if ("op" in arg && arg.op !== "&&") {
                    console.warn(`Unsupported operator "${arg.op}"`);
                }

                if ("comment" in arg) {
                    console.warn(`Skipping comment "${arg.comment}"`);
                }
            }
        } else {
            commands.push(parsed.splice(0) as string[]);
            break;
        }
    }

    for (const command of commands) {
        await executeCommand(command, flatex, matrix);
    }
};

const executeCommand = (args: string[], flatex: FlatexService, matrix: MatrixService): Promise<void> => {
    return new Promise<void | string>((resolve, reject) => {
        return yargs()
            .strictOptions()
            .command("authorize", "Authorize transaction PIN", (yargs) => yargs,
                async () => {
                    // TODO: move this maybe somewhere else as "Command"
                    if (flatex.isAuthorized) {
                        await matrix.sendText("Already authorized.").catch(console.warn);
                    } else {
                        await flatex.authorize().catch(console.error);
                        await matrix.sendText("Authorization succeeded.").catch(console.error);
                    }
                })
            .command("tan", "Enter pTAN", (yargs) => yargs,
                async (argv) => {
                    // TODO: see above
                    const value = argv._.slice(1).map(e => e.toString()).join("");

                    if (pinResolver) {
                        pinResolver(value);
                        // TODO
                        // pinResolver = null;
                    }
                })
            .command(["balance", "cash"], "Portfolio balance", (yargs) => yargs, async () => {
                await new BalanceCommand({}).run(flatex, matrix).catch(console.error);
            })
            .command(["securities", "depot", "portfolio"], "Portfolio securities", (yargs) => yargs, async () => {
                await new SecuritiesCommand({}).run(flatex, matrix).catch(console.error);
            })
            .command("orders [mode]", "Show orders", (yargs) =>
                yargs
                    .positional("mode", {
                        choices: ["all", "today", "open"],
                        type: "string",
                        default: "today"
                    })
                    .options("n", {
                        type: "number",
                        default: 10
                    })
                    .options("show-hidden", {
                        type: "boolean",
                        default: false
                    }), async (argv) => {
                await new OrdersCommand({
                    mode: argv.mode as any,
                    hidden: argv.showHidden,
                    pageSize: argv.n
                }).run(flatex, matrix);
            })
            .command(["orders-cancel", "order-cancel"], "Cancel order", (yargs) => yargs, async (argv) => {
                await new OrdersCancel({orders: argv._.slice(1).map(e => e.toString())}).run(flatex, matrix);
            })
            .command(["orders-buy <sin> <qty>", "order-buy <sin> <qty>"], "Place buy order", (yargs) =>
                yargs
                    .positional("sin", {
                        type: "string",
                        demandOption: true
                    })
                    .positional("qty", {
                        type: "number",
                        demandOption: true
                    })
                    .options("limit", {
                        type: "number"
                    })
                    .options("stop-market", {
                        type: "number"
                    })
                    .options("force", {
                        alias: ["f"],
                        type: "boolean",
                        default: false
                    })
                    .options("exchange", {
                        type: "string"
                    }), async (argv) => {

                const result = await getExchange(flatex, matrix, argv.sin, argv.exchange);
                if (!result) {
                    return;
                }

                let order: AvailableOrderTypes | null = null;
                if (argv.limit) {
                    order = <LimitBuyOrder>{
                        sell: false,
                        limitExtension: -1,
                        limitPrice: {
                            value: argv.limit,
                            currency: result.currency
                        }
                    };
                } else if (argv.stopMarket) {
                    order = <StopMarketBuyOrder>{
                        sell: false,
                        limitExtension: 4,
                        stopLimit: {
                            value: argv.stopMarket,
                            currency: result.currency
                        }
                    };
                }

                if (!order && argv.force) {
                    order = <MarketBuyOrder>{
                        sell: false,
                        limitExtension: 2
                    };
                }

                if (!order) {
                    matrix.sendText("Unsupported order type (place a market order with --force)").catch(console.warn);
                    return;
                }

                await new OrdersPlace({
                    ...order,
                    exchange: result.exchange,
                    qty: argv.qty,
                    isin: result.isin,
                }).run(flatex, matrix);
            })
            .command(["orders-sell <sin> [qty]", "order-sell <sin> [qty]"], "Place sell order", (yargs) =>
                yargs
                    .positional("sin", {
                        type: "string",
                        demandOption: true
                    })
                    .positional("qty", {
                        type: "number",
                        demandOption: true
                    })
                    .options("limit", {
                        type: "number"
                    })
                    .options("stop-market", {
                        type: "number"
                    })
                    .options("oco", {
                        type: "boolean",
                        default: false
                    })
                    .options("force", {
                        alias: ["f"],
                        type: "boolean",
                        default: false
                    })
                    .options("exchange", {
                        type: "string"
                    }), async (argv) => {

                const security = await flatex.securities().then(res => {
                    if (res.securities) {
                        return res.securities.find(s => s.paper.isin === argv.sin || s.paper.sin === argv.sin);
                    }
                }) ?? {
                    purchasePerfData: {value: {currency: "EUR"}},
                    quantityAvailable: {value: 1000},
                    paper: {isin: argv.sin}
                };

                if (!security) {
                    matrix.sendText(`${argv.sin}: no position in portfolio`).catch(console.warn);
                    return;
                }

                if (!security.quantityAvailable.value || (argv.qty && security.quantityAvailable.value < argv.qty)) {
                    matrix.sendText(`${argv.sin}: no quantity available`).catch(console.warn);
                    return;
                }

                const result = await getExchange(flatex, matrix, argv.sin, argv.exchange);
                if (!result) {
                    return;
                }

                let order: AvailableOrderTypes | null = null;
                if (argv.oco && argv.limit && argv.stopMarket) {
                    order = <OCOMarketSellOrder>{
                        sell: true,
                        limitExtension: 5,
                        stopLimit: {
                            value: argv.stopMarket,
                            currency: security.purchasePerfData.value.currency
                        },
                        limitPriceOCO: {
                            value: argv.limit,
                            currency: security.purchasePerfData.value.currency
                        },
                        orderType: "OCO"
                    };
                } else if (argv.limit) {
                    order = <LimitSellOrder>{
                        sell: true,
                        limitExtension: -1,
                        limitPrice: {
                            value: argv.limit,
                            currency: security.purchasePerfData.value.currency
                        }
                    };
                } else if (argv.stopMarket) {
                    order = <StopMarketSellOrder>{
                        sell: true,
                        limitExtension: 5,
                        stopLimit: {
                            value: argv.stopMarket,
                            currency: security.purchasePerfData.value.currency
                        }
                    };
                }

                if (!order && argv.force) {
                    order = <MarketSellOrder>{
                        sell: true,
                        limitExtension: 0
                    };
                }

                if (!order) {
                    matrix.sendText("Unsupported order type (place a market order with --force)").catch(console.warn);
                    return;
                }

                await new OrdersPlace({
                    ...order,
                    exchange: result.exchange,
                    qty: security.quantityAvailable.value,
                    isin: security.paper.isin,
                }).run(flatex, matrix);
            })
            .command(["ko <strategy> <sin>"], "Search for knockout certificates", yargs =>
                yargs
                    .positional("strategy", {
                        choices: ["short", "long"],
                        type: "string"
                    })
                    .positional("sin", {
                        type: "string",
                        demandOption: true
                    })
                    .options("from", {
                        type: "number",
                        default: 4
                    })
                    .options("to", {
                        type: "number",
                        default: 20
                    })
                    .options("currency", {
                        type: "string"
                    }), async argv => {
                await new DerivativeFinderCommand({
                    searchValue: argv.sin,
                    leverageAskRange: [argv.from, argv.to],
                    strategy: argv.strategy === "long" ? "CALL" : "PUT",
                    currency: argv.currency
                }).run(flatex, matrix);
            })
            .command(["agent-new"], "New agent", yargs =>
                    yargs
                        .positional("strategy", {
                            choices: ["short", "long"],
                            type: "string",
                            // TODO: verify
                            demandOption: true
                        })
                        .positional("sin", {
                            type: "string",
                            demandOption: true
                        })
                        .positional("size", {
                            type: "number"
                        })
                        .options("at", {
                            type: "number",
                            demandOption: true
                        })
                        .options("leverage", {
                            type: "number",
                            demandOption: true
                        })
                        .options("risk", {
                            type: "number",
                            default: 0.02
                        })
                        .options("currency", {
                            type: "string"
                        }), async argv => {
                    await new AgentNewCommand({
                        strategy: argv.strategy === "long" ? "CALL" : "PUT",
                        searchValue: argv.sin,
                        currency: argv.currency,
                        leverage: argv.leverage,
                        risk: argv.risk,
                        size: argv.size,
                        at: argv.at
                    }).run(flatex, matrix);
                }
            )
            .command(["agent-start"], "Start agent", yargs =>
                    yargs.positional("id", {
                        type: "number",
                        demandOption: true
                    }), async argv => {
                    return;
                }
            )
            .showHelpOnFail(false)
            .parse(args, (err: Error | undefined, argv: unknown, output: string) => {
                if (err) {
                    reject(err);
                }

                resolve(output);
            });
    }).then(result => {
            if (result) {
                result = result.replace(/app\.js /g, "");
                matrix.sendHtmlText(`<pre>${result}</pre>`).catch(console.error);
            }
        }
    ).catch(e => {
        console.error(e);
        matrix.sendHtmlText(`<pre>${e}</pre>`).catch(console.error);
    });
};
