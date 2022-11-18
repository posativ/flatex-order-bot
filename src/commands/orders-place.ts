import { Command } from "./index";
import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";
import { OrderArgs } from "../connectors/flatex-client/flatex-client";
import { AvailableOrderTypes } from "../connectors/flatex-client/flatex-request";

export type OrdersPlaceArgs = OrderArgs & AvailableOrderTypes

// TODO: OrdersPlaceCommand
export class OrdersPlace implements Command {

    constructor(private args: OrdersPlaceArgs) {
    }

    async run(flatex: FlatexService, matrix: MatrixService): Promise<void> {
        try {
            if (!flatex.isAuthorized) {
                await flatex.authorize();
            }
        } catch (e) {
            console.error("Unable to authorize", e);
            matrix.sendText(e.toString()).catch(console.warn);
        }

        flatex
            .placeOrder(this.args)
            .then((res) => matrix.sendText(`Order ${res.orderId} successfully placed`))
            .catch(e => {
                console.error("Unable to place order: ", e);
                console.error(this.args);
                matrix.sendText(e.toString()).catch(console.warn);
            });
    }
}
