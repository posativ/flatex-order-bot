import { Command } from "./index";
import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";
import fs from "fs/promises";
import Mustache from "mustache";

// eslint-disable-next-line
export interface BalanceCommandArgs {

}

export class BalanceCommand implements Command {

    constructor(private args: BalanceCommandArgs) {
    }

    async run(flatex: FlatexService, matrix: MatrixService): Promise<void> {
        const info = await flatex.balance().then(r => r.balanceInfo);
        const template = await fs.readFile("src/commands/balance.mustache", {encoding: "utf-8"});
        const output = Mustache.render(template, {
            balance: {
                booked: info.balanceBooked,
                available: info.maxBuyingPowerOrder,
                creditLine: info.creditLine

            }
        });

        matrix
            .sendHtmlText(output)
            .catch(console.warn);
    }
}
