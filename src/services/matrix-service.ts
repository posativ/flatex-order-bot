import { AutojoinRoomsMixin, AutojoinUpgradedRoomsMixin, MatrixClient, SimpleFsStorageProvider } from "matrix-bot-sdk";

interface MatrixConfiguration {
    homeServerUrl: string
    accessToken: string
    storage: string
    roomId: string
}

class MatrixService {

    private readonly client: MatrixClient
    private userId: string | undefined

    constructor(
        private configuration: MatrixConfiguration,
        onMessage: (roomId: string, sender: string, message: string) => void
        ) {
        const client = new MatrixClient(
            configuration.homeServerUrl,
            configuration.accessToken,
            new SimpleFsStorageProvider(configuration.storage));
        AutojoinRoomsMixin.setupOnClient(client);
        AutojoinUpgradedRoomsMixin.setupOnClient(client);

        this.client = client;
        this.client.on("room.message", (roomId, event) => {
            if (!event["content"] || event["sender"] === this.userId) {
                return;
            }

            if (roomId !== this.configuration.roomId) {
                return;
            }

            try {
                onMessage(roomId, event["sender"], event["content"]["body"]);
            } catch (e) {
                console.error(e);
            }
        });
    }

    async connect(): Promise<void> {
        await this.client.start();
        await this.client.getUserId().then(id => this.userId = id);
        console.log(`Connected to ${this.client.homeserverUrl}`);
    }

    async disconnect(): Promise<void> {
        await this.client.stop();
        console.log(`Disconnected from ${this.client.homeserverUrl}`);
    }

    async sendText(message: string): Promise<void> {
        await this.client.sendText(this.configuration.roomId, message);
    }

    async sendHtmlText(message: string): Promise<void> {
        await this.client.sendHtmlText(this.configuration.roomId, message);
    }
}

export {
    MatrixService
};
