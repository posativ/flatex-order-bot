import * as t from "io-ts";
import * as tPromise from "io-ts-promise";
import { JsonFromString, NumberFromString } from "io-ts-types";
import { FlatexError } from "./flatex-client";
import { handleDecodeError } from "../../utils/io-ts-error-handler";
import { DateTimeFromISOString } from "../../utils/io-ts-luxon";
import { AvailableOrderTypes } from "./flatex-request";

export const CODE_OK = "0";
export const CODE_ERROR = "1";
export const CODE_SESSION_INVALID = "10";
export const CODE_LENGTH_INVALID = "107";
export const CODE_IDENTIFICATION_INVALID = "291";
export const CODE_IDENT_REQUEST_INVALID = "304";
export const CODE_PIN_INVALID = "348";
export const CODE_CONFIRM_AUTH_USE_CASE_REQUEST_INVALID = "403";
export const CODE_AUTH_USE_CASE_ID_INVALID = "465";
export const CODE_IDENTIFICATION_CHALLENGE_EXPIRED = "PTS_100";

interface Error {
    code: string,
    text: string,
    errors?: Error[]
}

const Error: t.Type<Error> = t.recursion("Error", () => t.type({
    code: t.string,
    text: t.string,
    errors: t.union([t.undefined, t.array(Error)])
}));

const isError = (error: Error): error is Error => error.code !== CODE_OK;

const Account = t.type({
    bank: t.type({
        bankName: t.string,
        bic: t.string,
        blz: t.string,
        countryCode: t.string
    }),
    number: t.string
});

const Quantity = t.type({
    currency: t.string,
    value: NumberFromString
});

const Value = t.type({
    currency: t.string,
    value: NumberFromString
});

const PerfData = t.type({
    ratingFxPrice: t.string,
    ratingPrice: Value,
    ratingPriceStckExchKey: t.union([t.undefined, t.string]),
    ratingPriceTime: t.union([t.undefined, DateTimeFromISOString]),
    value: Value
});

const Instrument = t.type({
    isin: t.string,
    name: t.string,
    sin: t.string,
    unit: t.number,
    symbol: t.union([t.undefined, t.string]),
    kind: t.union([t.undefined, t.string]),
    currency: t.union([t.undefined, t.string])
});

const Security = t.type({
    currentPerfData: PerfData,
    custodian: t.number,
    lendingValue: Value,
    lendingWeight: t.string,
    lockType: t.number,
    paper: Instrument,
    previousDayPerfData: t.union([t.undefined, t.null, PerfData]),
    purchasePerfData: PerfData,
    quantity: Quantity,
    quantityAvailable: Quantity,
    riskClass: t.string,
    storageLocation: t.number,
    storageLocationDescription: t.string
});

export const Response = t.union([t.type({
    error: Error
}), t.type({
    error: t.type({
        code: t.literal(CODE_OK),
        text: t.string
    })
})]);

export const ProcessLogonResponse = t.intersection([Response, t.type({
    authenticationMethodList: t.array(t.string),
    sessionId: t.string
})]);

export const ProcessPreparationResponse = t.intersection([Response, t.type({
    accountInfos: t.array(t.intersection([Account, t.type({
        accountType: t.string
    })]))
})]);

export const ProcessBalanceInfoResponse = t.intersection([Response, t.type({
    balanceInfo: t.type({
        account: t.type({
            number: t.string
        }),
        balanceBooked: t.type({
            amount: Value,
            datetime: DateTimeFromISOString
        }),
        creditLine: Value,
        maxBuyingPowerMoneyTransfer: Value,
        maxBuyingPowerOrder: Value,
    })
})]);

export const ProcessPortfolioResponse = t.intersection([Response, t.type({
    depot: t.type({
        number: t.string
    }),
    depotLendingValue: Value,
    depotValue: Value,
    depotValuePrevDay: t.union([t.undefined, Value]),
    securities: t.union([t.undefined, t.array(Security)])
})]);

export const ProcessOrderListResponse = t.intersection([Response, t.type({
    depot: Account,
    orders: t.union([t.undefined, t.array(t.intersection([t.type({
        account: t.type({
            number: t.string
        }),
        creation: DateTimeFromISOString,
        creationType: t.number,
        customerOrder: t.boolean,
        depot: t.type({
            number: t.string
        }),
        orderId: t.string,
        paper: Instrument,
        sparplanId: t.union([t.undefined, t.null, JsonFromString]),
        state: t.union([
            t.literal(1), // entgegengenommen
            t.literal(2), // gerouted
            t.literal(4), // ausgeführt
            t.literal(5), // gestrichen
            t.literal(7), // abgelaufen
            t.literal(11), // abgelehnt
            // t.literal(?), // teilweise ausgeführt
        ]),
        stockExchange: t.string,
        validity: t.string,
        validityKind: t.union([
            t.literal(1), // Tagesgültig
            t.literal(2), // Gültig bis Monatsende
            t.literal(3) // Gültig bis <validity>
        ]),
        value: Value,
        valueDone: NumberFromString
    }), AvailableOrderTypes]))]),
    hasMore: t.boolean
})]);

export const ProcessSubmitCredentialResponse = t.intersection([Response, t.type({
    identificationUseCase: t.type({
        authUseCaseId: t.string
    })
})]);

export const ProcessConfirmAuthUseCaseResponse = t.intersection([Response, t.type({
    response: t.type({
        error: Error,
        identificationUseCase: t.type({
            authUseCaseId: t.string
        })
    })
})]);

export const ProcessSearchPaperResponse = t.intersection([Response, t.type({
    papers: t.array(t.type({
        currency: t.string,
        exchangeInfoList: t.array(t.type({
            currency: t.string,
            exchange: t.string,
            exchangeDescription: t.string,
            maxValidityValue: t.number,
            minSize: NumberFromString,
            minSizeSavingPlan: NumberFromString,
            modifies: t.number,
            nominalTrading: t.boolean,
            savingPlan: t.boolean,
            tradeType: t.string,
            validityType: t.number
        })),
        isin: t.string,
        kind: t.string,
        name: t.string,
        sin: t.string,
        unit: t.number,
        symbol: t.union([t.undefined, t.string]),
    })),
    morePapers: t.boolean,
})]);

export const ProcessPlaceOrderResponse = t.intersection([Response, t.type({
    identificationUseCase: t.union([t.undefined, t.null, t.type({
        authUseCaseId: t.string
    })]),
    orderId: t.string
})]);

export const ProcessCancelOrderResponse = t.intersection([Response, t.type({
    identificationUseCase: t.union([t.undefined, t.null, t.type({
        authUseCaseId: t.string
    })])
})]);

export const tryDecodeFlatex = function <Output extends Response, Input>(type: t.Decoder<Input, Output>): (value: Input) => Promise<Output> {
    const parseFlatexError = (error: Error): Error | null => {
        if (isError(error)) {
            if (error.errors && error.errors.length > 0) {
                return parseFlatexError(error.errors[0]);
            }

            return error;
        }

        return null;
    };

    return (value) => {
        const response = tPromise.decode(type)(value);
        return response
            .then(res => {
                const error = parseFlatexError(res.error);
                if (error) {
                    throw new FlatexError(error.code, error.text);
                } else {
                    return res;
                }
            })
            .catch(res => {
                return tPromise.decode(Response, value).then(response => {
                    const error = parseFlatexError(response.error);
                    if (error) {
                        throw new FlatexError(error.code, error.text);
                    }

                    return handleDecodeError(res);
                });
            });
    };
};

export type Response = t.TypeOf<typeof Response>
export type ProcessLogonResponse = t.TypeOf<typeof ProcessLogonResponse>
export type ProcessPreparationResponse = t.TypeOf<typeof ProcessPreparationResponse>
export type ProcessBalanceInfoResponse = t.TypeOf<typeof ProcessBalanceInfoResponse>
export type ProcessPortfolioResponse = t.TypeOf<typeof ProcessPortfolioResponse>
export type ProcessOrderListResponse = t.TypeOf<typeof ProcessOrderListResponse>
export type ProcessSubmitCredentialResponse = t.TypeOf<typeof ProcessSubmitCredentialResponse>
export type ProcessConfirmAuthUseCaseResponse = t.TypeOf<typeof ProcessConfirmAuthUseCaseResponse>
export type ProcessSearchPaperResponse = t.TypeOf<typeof ProcessSearchPaperResponse>
export type ProcessPlaceOrderResponse = t.TypeOf<typeof ProcessPlaceOrderResponse>
export type ProcessCancelOrderResponse = t.TypeOf<typeof ProcessCancelOrderResponse>
