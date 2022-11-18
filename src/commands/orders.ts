import fs from "fs/promises";
import * as _ from "lodash";
import Mustache from "mustache";
import { DateTime } from "luxon";
import { Command } from "./index";
import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";
import {
    isLimitBuyOrder,
    isLimitSellOrder,
    isMarketBuyOrder,
    isMarketSellOrder,
    isOCOLimitBuyOrder,
    isOCOLimitSellOrder,
    isOCOMarketBuyOrder,
    isOCOMarketSellOrder,
    isStopLimitBuyOrder,
    isStopLimitSellOrder,
    isStopMarketBuyOrder,
    isStopMarketSellOrder,
    isTrailingStopLimitBuyOrder,
    isTrailingStopLimitSellOrder,
    isTrailingStopMarketBuyOrder,
    isTrailingStopMarketSellOrder
} from "../connectors/flatex-client/flatex-request";

export interface OrdersCommandArgs {
    mode: "all" | "today" | "open"
    hidden: boolean
    pageSize: number
}

export class OrdersCommand implements Command {

    private readonly defaultVisible = [1, 2, 4]

    constructor(private args: OrdersCommandArgs) {
    }

    async run(flatex: FlatexService, matrix: MatrixService): Promise<void> {
        let orders;
        if (this.args.mode === "all") {
            const [today, open, archived] = (await Promise.all([
                flatex.orders(false, false).then(resp => resp.orders ?? []),
                flatex.orders(false, true).then(resp => resp.orders ?? []),
                flatex.orders(true, false).then(resp => resp.orders ?? [])
            ]).catch(console.error)) ?? [];

            if (today === undefined || open === undefined || archived === undefined) {
                return;
            }
            orders =
                _.sortedUniqBy(
                    _.sortBy(today.concat(open).concat(archived), e => -e.orderId), e => e.orderId);
        } else if (this.args.mode === "today") {
            const today = await flatex.orders(false, false)
                .then(resp => resp.orders ?? [])
                .catch(console.error) ?? [];
            orders =
                _.sortedUniqBy(
                    _.sortBy(today, e => -e.orderId), e => e.orderId);
        } else if (this.args.mode === "open") {
            const open = await flatex.orders(false, true)
                .then(resp => resp.orders ?? [])
                .catch(console.error) ?? [];
            orders =
                _.sortedUniqBy(
                    _.sortBy(open, e => -e.orderId), e => e.orderId);
        }

        if (!orders) {
            return;
        }

        const template = await fs.readFile("src/commands/orders.mustache", {encoding: "utf-8"});
        const output = Mustache.render(template, {
            orders: orders
                .filter(o => {
                    if (this.args.hidden) {
                        return true;
                    }

                    return this.defaultVisible.includes(o.state);
                })
                .slice(0, this.args.pageSize)
                .reverse()
                .map(order => ({
                    ...order,
                    date: order.creation.toFormat("dd.MM.yyyy"),
                    time: order.creation.setLocale("de").toLocaleString(DateTime.TIME_24_WITH_SECONDS),
                    onvistaUrl: `https://www.onvista.de/${order.paper.isin}`,
                    stockExchangeName: () => {
                        switch (order.stockExchange) {
                            case "ETR":
                                return "Xetra";
                            default:
                                return order.stockExchange;
                        }
                    },
                    additionalArgs: () => {
                        if (isLimitBuyOrder(order) || isLimitSellOrder(order)) {
                            return `${order.limitPrice.value.toFixed(2)}`;
                        } else if (isMarketBuyOrder(order) || isMarketSellOrder(order)) {
                            return "Market";
                        } else if (isStopLimitBuyOrder(order) || isStopLimitSellOrder(order)) {
                            return `${order.limitPrice.value.toFixed(2)} / ${order.stopLimit.value.toFixed(2)}`;
                        } else if (isOCOMarketBuyOrder(order) || isOCOMarketSellOrder(order) || isOCOLimitBuyOrder(order) || isOCOLimitSellOrder(order)) {
                            return `${order.limitPriceOCO.value.toFixed(2)} / ${order.stopLimit.value.toFixed(2)}`;
                        } else if (isStopMarketBuyOrder(order) || isStopMarketSellOrder(order)) {
                            return `${order.stopLimit.value.toFixed(2)}`;
                        } else if (isTrailingStopMarketBuyOrder(order) || isTrailingStopMarketSellOrder(order) || isTrailingStopLimitBuyOrder(order) || isTrailingStopLimitSellOrder(order)) {
                            return `${order.trailingStopLimit.value.toFixed(2)} / ${order.stopLimit.value.toFixed(2)}`;
                        } else {
                            console.warn("Unsupported order");
                        }
                    },
                    isDeleted: () => !this.defaultVisible.includes(order.state),
                    isPending: () => order.state === 1 || order.state === 2,
                    isExecuted: () => order.state === 4
                })),
        });

        matrix
            .sendHtmlText(output)
            .catch(console.warn);
    }
}
