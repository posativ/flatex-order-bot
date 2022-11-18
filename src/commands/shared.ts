import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";
import fs from "fs/promises";
import Mustache from "mustache";
import { Knockout, Quote } from "../connectors/onvista-client/onvista-response";
import { DateTime } from "luxon";
import _ from "lodash";

const exchangesByPriorities = [
    "A54", // HSBC
    "A57", // Société Générale
    "A71", // Goldman Sachs
    "A75", // UBS Investments
    "A19", // JP Morgan
];

export interface Exchange {
    exchange: string
    currency: string
}

export const getExchange = async (flatex: FlatexService, matrix: MatrixService, sin: string, exchange?: string): Promise<(Exchange & { isin: string }) | null> => {
    const search = await flatex.search(sin);
    if (!search) {
        matrix.sendText(`${sin}: unable to retrieve information`).catch(console.warn);
        return null;
    }

    const paper = search.papers.find(p => p.isin === sin || p.sin === sin);
    if (!paper) {
        matrix.sendText(`${sin}: unable match paper`).catch(console.warn);
        return null;
    }

    if (exchange) {
        const item = paper.exchangeInfoList.find(e => e.exchange === exchange);
        if (item) {
            return {...item, isin: paper.isin};
        }
    } else {
        for (const prio of exchangesByPriorities) {
            for (const item of paper.exchangeInfoList) {
                if (item.exchange === prio) {
                    return {...item, isin: paper.isin};
                }
            }
        }
    }

    const template = await fs.readFile("src/commands/shared-exchanges-error.mustache", {encoding: "utf-8"});
    const output = Mustache.render(template, {
        sin: sin,
        exchange: exchange,
        exchangeInfoList: paper.exchangeInfoList
    });
    matrix.sendHtmlText(output).catch(console.warn);

    return null;
};


export const getLast = (quotes: Quote[], currency: string): { value: number, ts: DateTime } | null => {
    const quote = _.reverse(_.sortBy(quotes, (x => x.datetimeLast))).find(q => q.isoCurrency === currency);
    if (quote && quote.last && quote.datetimeLast) {
        return {
            value: quote.last,
            ts: quote.datetimeLast
        };
    }

    return null;
};

export const getAsk = (quotes: Quote[], currency: string): number | null => {
    const quote = _.reverse(_.sortBy(quotes, (x => x.datetimeLast))).find(q => q.isoCurrency === currency);
    if (quote && quote.ask) {
        return quote.ask;
    }

    return null;
};

export const getBid = (quotes: Quote[], currency: string): number | null => {
    const quote = _.reverse(_.sortBy(quotes, (x => x.datetimeLast))).find(q => q.isoCurrency === currency);
    if (quote && quote.bid) {
        return quote.bid;
    }

    return null;
};

export const getSpread = (quotes: Quote[], instrument: Knockout): number => {
    const ask = getAsk(quotes, instrument.isoCurrency);
    const bid = getBid(quotes, instrument.isoCurrency);
    if (!ask || !bid) {
        return NaN;
    }

    return Math.abs((ask - bid) / ask);
};

export const getLeverage = (strategy: "PUT" | "CALL", quotes: Quote[], instrument: Knockout): number => {
    const last = getLast(quotes, instrument.isoCurrencyUnderlying);
    if (!last) {
        return NaN;
    }

    if (strategy === "PUT") {
        return 1 / (instrument.knockOutAbs / last.value - 1);
    } else {
        return 1 / (last.value / instrument.knockOutAbs - 1);
    }
};
