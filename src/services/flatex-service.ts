import { interval, startWith, Subscription, switchMap } from "rxjs";
import { Account, FlatexApiClient, FlatexError, isFlatexError, OrderArgs } from "../connectors/flatex-client/flatex-client";
import { LocalStorage } from "node-localstorage";
import {
    CODE_OK,
    CODE_SESSION_INVALID, ProcessBalanceInfoResponse,
    ProcessCancelOrderResponse,
    ProcessOrderListResponse,
    ProcessPlaceOrderResponse,
    ProcessPortfolioResponse,
    ProcessSearchPaperResponse
} from "../connectors/flatex-client/flatex-response";
import { AvailableOrderTypes, ProcessBalanceArgs } from "../connectors/flatex-client/flatex-request";

export interface FlatexAuth {
    principal: string
    credential: string
}

const PING_INTERVAL = 5 * 60 * 1000;
const KEY_SESSION_ID = "session-id";
const KEY_TRANSACTION_PIN = "transaction-pin";
const KEY_ACCOUNT_CASH = "account-cash";
const KEY_ACCOUNT_PORTFOLIO = "account-portfolio";

export class FlatexService {

    private readonly localStorage = new LocalStorage("./.flatex-session");
    private subscriptions = new Subscription();

    constructor(
        private client: FlatexApiClient,
        private auth: FlatexAuth,
        private pinFn: () => Promise<string>) {
    }

    private set cashAccount(value: Account | null) {
        this.localStorage.setItem(KEY_ACCOUNT_CASH, JSON.stringify(value));
    }

    private get cashAccount(): Account | null {
        const value = this.localStorage.getItem(KEY_ACCOUNT_CASH);
        if (value) {
            return JSON.parse(value) as Account | null;
        }

        return null;
    }

    private set portfolioAccount(value: Account | null) {
        this.localStorage.setItem(KEY_ACCOUNT_PORTFOLIO, JSON.stringify(value));
    }

    private get portfolioAccount(): Account | null {
        const value = this.localStorage.getItem(KEY_ACCOUNT_PORTFOLIO);
        if (value) {
            return JSON.parse(value) as Account | null;
        }

        return null;
    }

    private get sessionId(): string | null {
        return this.localStorage.getItem(KEY_SESSION_ID);
    }

    private set sessionId(value: string | null) {
        if (value == null) {
            this.localStorage.removeItem(KEY_SESSION_ID);
        } else {
            this.localStorage.setItem(KEY_SESSION_ID, value);
        }
    }

    private get transactionPin(): string | null {
        return this.localStorage.getItem(KEY_TRANSACTION_PIN);
    }

    private set transactionPin(value: string | null) {
        if (value == null) {
            this.localStorage.removeItem(KEY_TRANSACTION_PIN);
        } else {
            this.localStorage.setItem(KEY_TRANSACTION_PIN, value);
        }
    }

    public get isAuthorized(): boolean {
        return this.transactionPin != null;
    }

    async connect(): Promise<void> {
        if (this.subscriptions.closed) {
            this.subscriptions = new Subscription();
        }

        interval(PING_INTERVAL)
            .pipe(
                startWith(-1),
                switchMap(() => {
                    return this.connectInternal().catch(e => {
                        if (e instanceof FlatexError) {
                            this.sessionId = null;
                            this.transactionPin = null;
                        }

                        console.error(e);
                    });
                }))
            .subscribe()
            .add(this.subscriptions);
    }

    private async connectInternal(): Promise<void> {
        if (this.sessionId) {
            await this.client.ping(this.sessionId).catch(error => {
                if (isFlatexError(error) && error.code === CODE_SESSION_INVALID) {
                    this.sessionId = null;
                    this.transactionPin = null;
                } else {
                    throw error;
                }
            });
            return;
        }

        const sessionResponse = await this.client.login(this.auth.principal, this.auth.credential);
        if (sessionResponse.error.code !== CODE_OK) {
            console.error(sessionResponse.error.text);
            return;
        }
        this.sessionId = sessionResponse.sessionId;

        if (!this.cashAccount || !this.portfolioAccount) {
            const accountsResponse = await this.client.accounts(this.auth.principal, this.sessionId);
            if (accountsResponse.error.code !== CODE_OK) {
                console.error(accountsResponse.error.text);
                return;
            }
            for (const accountType of ["CSH", "DEP"]) {
                const obj = accountsResponse.accountInfos.find((e) => e.accountType === accountType);
                const account = obj ? {
                    number: obj.number,
                    name: obj.bank.bankName,
                    bic: obj.bank.bic,
                    blz: obj.bank.bic,
                    countryCode: obj.bank.countryCode,
                } : null;
                if (accountType === "CSH") {
                    this.cashAccount = account;
                } else if (accountType === "DEP") {
                    this.portfolioAccount = account;
                }
            }
        }
    }

    async debugInfo(): Promise<unknown> {
        return {
            KEY_SESSION_ID: this.sessionId,
            KEY_TRANSACTION_PIN: this.transactionPin
        };
    }

    async balance(): Promise<ProcessBalanceInfoResponse> {
        if (!this.sessionId || !this.cashAccount) {
            return Promise.reject("Session id or cash account is null");
        }

        return await this.client.balance(this.auth.principal, this.sessionId, this.cashAccount);
    }

    async securities(): Promise<ProcessPortfolioResponse> {
        if (!this.sessionId || !this.portfolioAccount) {
            return Promise.reject("Session id or portfolio account is null");
        }

        return await this.client.securities(this.auth.principal, this.sessionId, this.portfolioAccount);
    }

    async orders(archivedOnly: boolean = false, openOnly: boolean = false): Promise<ProcessOrderListResponse> {
        if (!this.sessionId || !this.portfolioAccount) {
            return Promise.reject("Session id or portfolio account is null");
        }

        return await this.client.orders(this.auth.principal, this.sessionId, this.portfolioAccount, archivedOnly, openOnly);
    }

    async authorize(timeout: number = 30_000): Promise<void> {
        if (!this.sessionId) {
            return Promise.reject("Session id is null");
        }

        const resp = await this.client.requestAuthCode(this.auth.principal, this.sessionId);

        this.transactionPin = await Promise.race([
            this.pinFn(),
            new Promise<string>((_, rej) => setTimeout(rej, timeout))
        ]);

        await this.client.confirmAuthCode(
            this.auth.principal,
            this.sessionId,
            this.transactionPin,
            resp.identificationUseCase.authUseCaseId);
    }

    async search(query: string): Promise<ProcessSearchPaperResponse> {
        if (!this.sessionId) {
            return Promise.reject("Session id is null");
        }

        return await this.client.search(this.auth.principal, this.sessionId, query);
    }

    async placeOrder(order: OrderArgs & AvailableOrderTypes): Promise<ProcessPlaceOrderResponse> {
        if (!this.sessionId || !this.cashAccount || !this.portfolioAccount || !this.transactionPin) {
            return Promise.reject("Session id portfolio account or transaction PIN is null");
        }

        return await this.client.placeOrder(this.auth.principal, this.sessionId, this.transactionPin, this.portfolioAccount, this.cashAccount, order);
    }

    async cancelOrder(id: string): Promise<ProcessCancelOrderResponse> {
        if (!this.sessionId || !this.portfolioAccount || !this.transactionPin) {
            return Promise.reject("Session id portfolio account or transaction PIN is null");
        }

        return await this.client.cancelOrder(this.auth.principal, this.sessionId, this.transactionPin, this.portfolioAccount, id);
    }

    async disconnect(): Promise<void> {
        return this.subscriptions.unsubscribe();
    }
}
