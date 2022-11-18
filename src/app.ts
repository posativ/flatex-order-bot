import "dotenv/config";
import { MatrixService } from "./services/matrix-service";
import { FlatexService } from "./services/flatex-service";
import { FlatexApiClient } from "./connectors/flatex-client/flatex-client";
import { parseInputAndExecuteCommands } from "./commands";

// TODO: IoC
export let pinResolver: ((value: string | PromiseLike<string>) => void) | null;

(async () => {
    // eslint-disable-next-line prefer-const
    let matrix: MatrixService;
    // eslint-disable-next-line prefer-const
    let flatex: FlatexService;
    const onMessage = async (roomId: string, sender: string, message: string) => {
        // remove control characters, if any
        message = message.replace(/[\u0000-\u001F\u007F-\u009F\u200B\u00AD]/g, "");

        await parseInputAndExecuteCommands(message, flatex, matrix);
    };

    if (!process.env.MATRIX_HOME_SERVER_URL) throw new Error("MATRIX_HOME_SERVER_URL is not defined");
    if (!process.env.MATRIX_ACCESS_TOKEN) throw new Error("MATRIX_ACCESS_TOKEN is not defined");
    if (!process.env.MATRIX_ROOM_ID) throw new Error("MATRIX_ROOM_ID is not defined");

    matrix = new MatrixService(
        {
            homeServerUrl: process.env.MATRIX_HOME_SERVER_URL,
            accessToken: process.env.MATRIX_ACCESS_TOKEN,
            roomId: process.env.MATRIX_ROOM_ID,
            storage: ".flatex-session/bot.json"
        },
        onMessage);
    await matrix.connect();

    if (!process.env.FLATEX_BASE_URL) throw new Error("FLATEX_BASE_URL is not defined");
    if (!process.env.FLATEX_PRINCIPAL) throw new Error("FLATEX_PRINCIPAL is not defined");
    if (!process.env.FLATEX_CREDENTIAL) throw new Error("FLATEX_CREDENTIAL is not defined");

    flatex = new FlatexService(new FlatexApiClient(process.env.FLATEX_BASE_URL), {
        principal: process.env.FLATEX_PRINCIPAL,
        credential: process.env.FLATEX_CREDENTIAL,
    }, () => {
        matrix.sendHtmlText("<p>Enter pin via <code>tan 12 34 56</code></p>");
        return new Promise<string>(resolve => {
            pinResolver = resolve;
        });
    });
    await flatex.connect();
})().then(() => console.log("Press CTRL-C to stop")).catch(error => {
    if (error && error.response) {
        console.error(error.response.data.error);
    } else {
        console.error(error);
    }
});
