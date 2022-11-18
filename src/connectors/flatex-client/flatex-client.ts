import { AxiosInstance, AxiosResponse, default as axios } from "axios";
import * as crypto from "crypto";
import {
    CODE_OK, ProcessBalanceInfoResponse,
    ProcessCancelOrderResponse,
    ProcessConfirmAuthUseCaseResponse,
    ProcessLogonResponse,
    ProcessOrderListResponse,
    ProcessPlaceOrderResponse,
    ProcessPortfolioResponse,
    ProcessPreparationResponse,
    ProcessSearchPaperResponse,
    ProcessSubmitCredentialResponse,
    Response,
    tryDecodeFlatex
} from "./flatex-response";
import {
    AvailableOrderTypes, ProcessBalanceArgs,
    ProcessCancelOrderArgs,
    ProcessConfirmAuthUseCaseArgs,
    ProcessLogonArgs,
    ProcessOrderListArgs,
    ProcessPingArgs,
    ProcessPlaceOrderArgs,
    ProcessPortfolioArgs,
    ProcessPreparationArgs,
    ProcessSearchPaperArgs,
    ProcessSubmitCredentialArgs,
    ProxyRequest
} from "./flatex-request";

export interface Account {
    number: string
    name: string
    bic: string
    blz: string
    countryCode: string
}

export interface OrderArgs {
    sell: boolean
    isin: string
    qty: number
    exchange: string
}

export class FlatexError extends Error {
    constructor(public readonly code: string, public readonly message: string) {
        super(`${code}: ${message}`);
    }
}

export const isFlatexError = (error: FlatexError): error is FlatexError => error.code !== CODE_OK;

export class FlatexApiClient {

    private readonly httpClient: AxiosInstance;

    constructor(proxyUrl: string) {
        this.httpClient = axios.create({
            baseURL: proxyUrl,
            timeout: 5000,
            validateStatus: status => {
                return (status >= 200 && status < 300) || (status >= 400 && status < 500);
            }
        });
        this.httpClient.interceptors.request.use(request => {
            console.log((request.data as ProxyRequest<null>).action);
            return request;
        });
    }

    login(principal: string, credential: string): Promise<ProcessLogonResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessLogonArgs>>("/", {
                action: "processLogon",
                args: {
                    principal: principal,
                    credential: {
                        credentialName: "PIN",
                        credential: crypto.createHash("sha256",).update(credential).digest("hex")
                    }
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessLogonResponse));
    }

    accounts(principal: string, session: string): Promise<ProcessPreparationResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessPreparationArgs>>("/", {
                action: "processPreparation",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal
                    }
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessPreparationResponse));
    }

    ping(session: string): Promise<Response> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessPingArgs>>("/", {
                action: "processPing",
                args: {
                    session: {
                        sessionId: session
                    }
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(Response));
    }

    balance(principal: string, session: string, cash: Account): Promise<ProcessBalanceInfoResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessBalanceArgs>>("/", {
                action: "processBalance",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal
                    },
                    account: {
                        number: cash.number,
                        bank: {
                            bankName: cash.name,
                            bic: cash.bic,
                            blz: cash.blz,
                            countryCode: cash.countryCode
                        }
                    },
                    synchron: true
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessBalanceInfoResponse));
    }

    securities(principal: string, session: string, depot: Account): Promise<ProcessPortfolioResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessPortfolioArgs>>("/", {
                action: "processPortfolio",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal
                    },
                    depot: {
                        number: depot.number,
                        bank: {
                            bankName: depot.name,
                            bic: depot.bic,
                            blz: depot.blz,
                            countryCode: depot.countryCode
                        }
                    },
                    synchron: true
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessPortfolioResponse));
    }

    orders(principal: string, session: string, depot: Account, archivedOrdersOnly: boolean, openOrdersOnly: boolean): Promise<ProcessOrderListResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessOrderListArgs>>("/", {
                action: "processOrderList",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal
                    },
                    depot: {
                        number: depot.number,
                        bank: {
                            bankName: depot.name,
                            bic: depot.bic,
                            blz: depot.blz,
                            countryCode: depot.countryCode
                        }
                    },
                    archivedOrdersOnly: archivedOrdersOnly,
                    openOrdersOnly: openOrdersOnly,
                    synchron: true
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessOrderListResponse));
    }

    requestAuthCode(principal: string, session: string, method: string = "pTAN"): Promise<ProcessSubmitCredentialResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessSubmitCredentialArgs>>("/", {
                action: "processSubmitCredential",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal,
                        authenticationMethod: method
                    },
                    sessionCredential: true
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessSubmitCredentialResponse));
    }

    confirmAuthCode(principal: string, session: string, pin: string, id: string, method: string = "pTAN"): Promise<ProcessConfirmAuthUseCaseResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessConfirmAuthUseCaseArgs>>("/", {
                action: "processConfirmAuthUseCase",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal,
                        authenticationMethod: method,
                        transactionPin: crypto.createHash("sha256",).update(pin).digest("hex")
                    },
                    authUseCaseId: id
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessConfirmAuthUseCaseResponse));
    }

    search(principal: string, session: string, query: string): Promise<ProcessSearchPaperResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessSearchPaperArgs>>("/", {
                action: "processSearchPaper",
                args: {
                    session: {
                        sessionId: session
                    },
                    searchObj: {
                        searchString: query,
                        searchIndicator: [0],
                        savingPlanOnly: false,
                        kindList: [
                            "AKT",
                            "BEZ",
                            "ANL",
                            "OS",
                            "ZERT",
                            "FOND"
                        ]
                    }
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessSearchPaperResponse));
    }

    placeOrder(principal: string, session: string, pin: string, depot: Account, account: Account, order: OrderArgs & AvailableOrderTypes, method: string = "pTAN"): Promise<ProcessPlaceOrderResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessPlaceOrderArgs<AvailableOrderTypes>>>("/", {
                action: "processPlaceOrder",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal,
                        authenticationMethod: method,
                        transactionPin: crypto.createHash("sha256",).update(pin).digest("hex"),
                        sessionCredential: true
                    },
                    order: {
                        depot: {
                            number: depot.number,
                            bank: {
                                bankName: depot.name,
                                bic: depot.bic,
                                blz: depot.blz,
                                countryCode: depot.countryCode
                            }
                        },
                        account: {
                            number: account.number,
                            bank: {
                                bankName: account.name,
                                bic: account.bic,
                                blz: account.blz,
                                countryCode: account.countryCode
                            }
                        },
                        paper: {
                            isin: order.isin
                        },
                        value: {
                            value: order.qty.toString(),
                            currency: "XXX"
                        },
                        stockExchange: order.exchange,
                        validity: undefined,
                        validityKind: 1,
                        ...order
                    }
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => {
                console.log({...response.data.error});
                return response.data;
            })
            .then(tryDecodeFlatex(ProcessPlaceOrderResponse));
    }

    cancelOrder(principal: string, session: string, pin: string, depot: Account, id: string, method: string = "pTAN"): Promise<ProcessCancelOrderResponse> {
        return this.httpClient
            .post<never, AxiosResponse, ProxyRequest<ProcessCancelOrderArgs>>("/", {
                action: "processCancelOrder",
                args: {
                    session: {
                        sessionId: session
                    },
                    identification: {
                        customerId: principal,
                        authenticationMethod: method,
                        transactionPin: crypto.createHash("sha256",).update(pin).digest("hex"),
                        sessionCredential: true
                    },
                    depot: {
                        number: depot.number,
                        bank: {
                            bankName: depot.name,
                            bic: depot.bic,
                            blz: depot.blz,
                            countryCode: depot.countryCode
                        }
                    },
                    orderId: id
                },
                provider: "flatex_at",
                platform: "android"
            })
            .then(response => response.data)
            .then(tryDecodeFlatex(ProcessCancelOrderResponse));
    }
}
