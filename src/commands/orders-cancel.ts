import { Command } from "./index";
import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";

export interface OrdersCancelArgs {
    orders: string[]
}

export class OrdersCancel implements Command {

    constructor(private args: OrdersCancelArgs) {
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

        this.args.orders.forEach((arg) => {
            const orderId = arg.replace("/[^\d+]/g", "");
            flatex
                .cancelOrder(orderId)
                .then(() => matrix.sendText(`Order ${orderId} successfully cancelled`))
                .catch(e => {
                    console.error(`Unable to cancel order: ${orderId}`, e);
                    matrix.sendText(e.toString()).catch(console.warn);
                });
        });
    }
}
