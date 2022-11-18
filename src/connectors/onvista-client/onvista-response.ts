import * as t from "io-ts";
import * as tPromise from "io-ts-promise";
import { OnvistaError } from "./onvista-client";
import { DateTimeFromISOString } from "../../utils/io-ts-luxon";

const EntityType = t.union([
    t.literal("BASKET"),
    t.literal("BOND"),
    t.literal("COMMODITY"),
    t.literal("CURRENCY"),
    t.literal("DERIVATIVE"),
    t.literal("FUND"),
    t.literal("FUTURE"),
    t.literal("INDEX"),
    t.literal("OPTION"),
    t.literal("PRECIOUS_METAL"),
    t.literal("STOCK"),
]);
export type EntityType = t.TypeOf<typeof EntityType>

const EntitySubType = t.union([
    t.literal("KNOCKOUT_CERTIFICATE"),
    t.literal("XXX")
]);
export type EntitySubType = t.TypeOf<typeof EntitySubType>

const Instrument = t.type({
    entityType: EntityType,
    entitySubType: t.union([t.undefined, EntitySubType]),
    entityValue: t.string,
    name: t.string,
    isin: t.union([t.undefined, t.string]),
    wkn: t.union([t.undefined, t.string]),
    symbol: t.union([t.undefined, t.string])
});
export type Instrument = t.TypeOf<typeof Instrument>

export const Quote = t.type({
    market: t.type({
        name: t.string,
        codeMarket: t.union([t.undefined, t.string]),
        nameExchange: t.union([t.undefined, t.string]),
        codeExchange: t.union([t.undefined, t.string]),
        idNotation: t.number,
        isoCountry: t.union([t.undefined, t.string])
    }),
    isoCurrency: t.string,
    bid: t.union([t.undefined, t.number]),
    volumeBid: t.union([t.undefined, t.number]),
    ask: t.union([t.undefined, t.number]),
    askVolume: t.union([t.undefined, t.number]),
    last: t.union([t.undefined, t.number]),
    volume: t.union([t.undefined, t.number]),
    datetimeLast: t.union([t.undefined, DateTimeFromISOString])
});
export type Quote = t.TypeOf<typeof Quote>

const Issuer = t.type({
    id: t.number,
    name: t.string,
    urlProspectus: t.union([t.undefined, t.string]),
    derivativesSubCategory: t.union([t.undefined, t.type({
        id: t.number,
        description: t.string,
        entitySubType: t.string,
        descriptionEntitySubType: t.string
    })]),
    codeExerciseRight: t.union([t.undefined, t.literal("C"), t.literal("P")])
});
export type Issuer = t.TypeOf<typeof Issuer>

export const Knockout = t.type({
    strikeAbs: t.number,
    dateMaturity: t.union([t.undefined, DateTimeFromISOString]),
    quanto: t.boolean,
    gearingAsk: t.number,
    knockOutAbs: t.number,
    isoCurrency: t.string,
    isoCurrencyUnderlying: t.string,
    openEnded: t.boolean,
    spread: t.number,
    coverRatio: t.number,
    dateCalculation: DateTimeFromISOString,
    dateFirstTrading: DateTimeFromISOString,
    premiumAsk: t.number,
});
export type Knockout = t.TypeOf<typeof Knockout>

const ErrorResponse = t.type({
    displayErrorMessage: t.string,
    errorCode: t.number,
    errorMessage: t.string,
    identifier: t.string,
    statusCode: t.number
});

export const SearchResponse = t.type({
    list: t.array(Instrument)
});
export type SearchResponse = t.TypeOf<typeof SearchResponse>

export const SnapshotResponse = t.type({
    type: t.union([
        t.literal("BondsSnapshot"),
        t.literal("CommoditySnapshot"),
        t.literal("CurrenciesSnapshot"),
        t.literal("DerivativesSnapshot"),
        t.literal("FundsSnapshot"),
        t.literal("IndicesSnapshot"),
        t.literal("PreciousMetalSnapshot"),
        t.literal("StocksSnapshot"),
    ]),
    instrument: Instrument,
    quote: Quote,
    quoteList: t.union([t.undefined, t.type({
        list: t.array(Quote)
    })]),
    stocksBalanceSheetList: t.union([t.undefined, t.type({
        list: t.array(t.type({
            isoCurrency: t.string,
            label: t.string
        }))
    })])
});
export type SnapshotResponse = t.TypeOf<typeof SnapshotResponse>

export const DerivativesFinderResponse = t.type({
    total: t.number,
    list: t.array(t.intersection([t.type({
        instrument: Instrument,
        instrumentUnderlying: Instrument,
        issuer: Issuer,
        quote: Quote,
        shortName: t.string,
        officialName: t.string,
    }), Knockout]))  // TODO: t.union([Knockout, ...])
});
export type DerivativesFinderResponse = t.TypeOf<typeof DerivativesFinderResponse>

export const tryDecodeOnvista = function <Output, Input>(type: t.Decoder<Input, Output>): (value: Input) => Promise<Output> {
    return (value) => {
        const response = tPromise.decode(type)(value);
        return response
            .catch((err) => {
                if ("errorCode" in value) {
                    return tPromise.decode(ErrorResponse, value).then(response => {
                        throw new OnvistaError(response.errorCode, response.errorMessage);
                    });
                }

                throw err;
            });
    };
};
