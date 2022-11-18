import { Command } from "./index";
import { OnvistaApiClient } from "../connectors/onvista-client/onvista-client";
import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";
import fs from "fs/promises";
import Mustache from "mustache";
import { DateTime } from "luxon";
import Color from "color";
import { getLast, getLeverage, getSpread } from "./shared";

export interface DerivativeFinderCommandArgs {
    searchValue: string
    currency?: string
    leverageAskRange: [number, number]
    strategy: "PUT" | "CALL"
}

export class DerivativeFinderCommand implements Command {
    constructor(private args: DerivativeFinderCommandArgs) {
    }

    async run(flatex: FlatexService, matrix: MatrixService): Promise<void> {
        try {
            const onvista = new OnvistaApiClient(process.env.ONVISTA_BASE_URL ?? "https://api.onvista.de");
            const instruments = await onvista.search(this.args.searchValue);
            if (instruments.list.length === 0) {
                matrix.sendText("Search result is empty").catch(console.warn);
                return;
            }
            const instrument = instruments.list[0];

            const snapshot = await onvista.snapshot(instrument);
            const isoCurrency = this.args.currency ?? snapshot.stocksBalanceSheetList?.list?.at(0)?.isoCurrency ?? "USD";

            const last = getLast(snapshot.quoteList?.list ?? [snapshot.quote], isoCurrency);
            if (!last) {
                matrix.sendText("Unable to find a recent quote value").catch(console.warn);
                return;
            }

            const response = await onvista.derivativesFinder({
                type: instrument.entityType,
                value: instrument.entityValue,
                knockOutAbsRange: this.args.strategy === "PUT"
                    ? [last.value + last.value / this.args.leverageAskRange[1], last.value + last.value / this.args.leverageAskRange[0]]
                    : [last.value - last.value / this.args.leverageAskRange[0], last.value - last.value / this.args.leverageAskRange[1]],
                exerciseRight: this.args.strategy,
                feature: ["STANDARD", "OTC_KO", "SMART_TURBO"]
            });
            const derivatives = response.list
                .map(derivative => ({
                    ...derivative,
                    spread: getSpread([derivative.quote], derivative),
                    gearingLast: getLeverage(this.args.strategy, [{...snapshot.quote, ask: snapshot.quote.last}], derivative),
                    onvistaUrl: `https://www.onvista.de/derivate/Knock-Outs/${derivative.instrument.entityValue}-${derivative.instrument.wkn}-${derivative.instrument.isin}`,
                }))
                .filter(derivative => {
                    if (derivative.instrumentUnderlying.entityValue !== instrument.entityValue) {
                        return false;
                    }

                    return !Number.isNaN(derivative.gearingLast) && derivative.gearingLast >= 0 && derivative.gearingLast < 1000;
                })
                .sort((a, b) => a.gearingLast - b.gearingLast)
                .splice(0, 50);

            if (derivatives.length === 0) {
                matrix.sendText("No derivatives found").catch(console.warn);
                return;
            }

            const template = await fs.readFile("src/commands/derivative-finder.mustache", {encoding: "utf-8"});
            const output = Mustache.render(template, {
                derivatives: derivatives.map(derivative => {
                    const last = getLast([derivative.quote], derivative.isoCurrency);
                    const isRecent = last && last.ts >= DateTime.now().minus({minute: 5});
                    const isOkayish = !isRecent && last && last.ts >= DateTime.now().minus({minute: 30});
                    return {
                        ...derivative,
                        gearingLastFormatted: !Number.isNaN(derivative.gearingLast)
                            ? derivative.gearingLast.toFixed(2).padStart(5, " ")
                            : undefined,
                        spreadFormatted: !Number.isNaN(derivative.spread)
                            ? `${(derivative.spread * 100).toFixed(1).padStart(4, " ")}%`
                            : " ∞ %",
                        spreadColor: Color.rgb("#cc4412").darken(Math.max(0, 1 - derivative.spread * 20)).hex(),
                        isRecent: isRecent,
                        isOkayish: isOkayish,
                        isWarning: !isRecent && !isOkayish
                    };
                })
            });

            matrix
                .sendHtmlText(output)
                .catch(console.warn);
        } catch (e) {
            matrix.sendHtmlText(`<pre>${e}</pre>`).catch(console.warn);
        }
    }
}
