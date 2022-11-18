import { Command } from "./index";
import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";
import { OnvistaApiClient } from "../connectors/onvista-client/onvista-client";
import { getLast, getLeverage, getSpread } from "./shared";

export interface AgentNewCommandArgs {
    searchValue: string
    strategy: "PUT" | "CALL"
    currency?: string
    size?: number
    at: number
    leverage: number
    risk: number
}

export class AgentNewCommand implements Command {

    constructor(private args: AgentNewCommandArgs) {
        if (args.risk >= 1) {
            throw new Error("'risk' has to be below 1.00");
        }
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

            const dx = last.value / Math.abs(this.args.at - last.value);
            const targetLeverage = this.args.leverage - this.args.leverage * dx;
            const response = await onvista.derivativesFinder({
                type: instrument.entityType,
                value: instrument.entityValue,
                gearingAskRange: [targetLeverage * 0.95, targetLeverage * 1.05],
                exerciseRight: this.args.strategy,
                feature: ["STANDARD", "OTC_KO", "SMART_TURBO"]
            });
            const derivatives = response.list
                .map(derivative => ({
                    ...derivative,
                    spread: getSpread([derivative.quote], derivative),
                }))
                .filter(derivative => {
                    if (derivative.instrumentUnderlying.entityValue !== instrument.entityValue) {
                        return false;
                    }
                })
                .sort((a, b) => a.spread - b.spread);

            if (derivatives.length === 0) {
                matrix.sendText("No derivatives found").catch(console.warn);
                return;
            }

            derivatives.forEach(console.log);
        } catch (e) {
            matrix.sendHtmlText(`<pre>${e}</pre>`).catch(console.warn);
        }
    }
}
