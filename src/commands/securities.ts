import { Command } from "./index";
import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";
import fs from "fs/promises";
import Mustache from "mustache";

// eslint-disable-next-line
export interface SecuritiesCommandArgs {

}

export class SecuritiesCommand implements Command {

    constructor(private args: SecuritiesCommandArgs) {
    }

    async run(flatex: FlatexService, matrix: MatrixService): Promise<void> {
        const securities = await flatex.securities().then(res => res.securities ?? []);
        const template = await fs.readFile("src/commands/securities.mustache", {encoding: "utf-8"});
        const output = Mustache.render(template, {
            securities: securities.map(security => {
                const initial = security.quantity.value * security.purchasePerfData.ratingPrice.value;
                const current = security.quantity.value * security.currentPerfData.ratingPrice.value;
                const change = Math.round((current / initial - 1) * 10000) / 10000;
                return {
                    ...security,
                    symbol: security.paper.symbol?.padStart(4, " "),
                    initialValue:`${initial.toFixed(2)} ${security.purchasePerfData.ratingPrice.currency}`,
                    changeValue: `${(current - initial).toFixed(2)} ${security.currentPerfData.ratingPrice.currency}`,
                    changePercentage: `${(change * 100).toFixed(2)} %`,
                    isUnchanged: change === 0,
                    isGreen: change > 0,
                    isRed: change < 0,
                    onvistaUrl: `https://www.onvista.de/${security.paper.isin}`
                };
            }),
        });

        matrix
            .sendHtmlText(output)
            .catch(console.warn);
    }
}
