import * as t from "io-ts";
import { NumberFromString } from "io-ts-types";

interface Session {
    sessionId: string
}

interface Identification {
    customerId: string
}

export const Price = t.type({
    currency: t.string,
    value: NumberFromString
});

interface Account {
    number: string
    bank: {
        bankName: string
        bic: string
        blz: string
        countryCode: string
    }
}

interface Value {
    value: string
    currency: string
}

export interface ProxyRequest<T> {
    action: string
    args: T
    provider: string
    platform: string
}

export interface ProcessLogonArgs {
    principal: string
    credential: {
        credentialName: string
        credential: string
    }
}

export interface ProcessPingArgs {
    session: Session
}

export interface ProcessPreparationArgs {
    session: Session
    identification: Identification
}

export interface ProcessBalanceArgs {
    session: Session
    identification: Identification
    account: Account
    synchron: true
}

export interface ProcessPortfolioArgs {
    session: Session
    identification: Identification
    depot: Account
    synchron: true
}

export interface ProcessOrderListArgs {
    session: Session
    identification: Identification
    openOrdersOnly: boolean
    archivedOrdersOnly: boolean
    depot: Account
    synchron: true
}

export interface ProcessSubmitCredentialArgs {
    session: Session
    identification: Identification & {
        authenticationMethod: string
    }
    sessionCredential: boolean
}

export interface ProcessConfirmAuthUseCaseArgs {
    session: Session
    identification: Identification & {
        authenticationMethod: string
        transactionPin: string
    }
    authUseCaseId: string
}

export interface ProcessSearchPaperArgs {
    session: Session
    searchObj: {
        searchString: string
        searchIndicator: number[]
        savingPlanOnly: boolean
        kindList: string[]
    }
}

// Market Buy
export type MarketBuyOrder = t.TypeOf<typeof MarketBuyOrder>
export const MarketBuyOrder = t.type({
    sell: t.literal(false),
    limitExtension: t.union([
        t.literal(0),
        t.literal(2)
    ])
});
export const isMarketBuyOrder = (order: AvailableOrderTypes): order is MarketBuyOrder =>
    order.sell === false && [0, 2].includes(order.limitExtension);

// Market Sell
export type MarketSellOrder = t.TypeOf<typeof MarketSellOrder>
export const MarketSellOrder = t.exact(t.type({
    sell: t.literal(true),
    limitExtension: t.union([
        t.literal(-1),
        t.literal(0)
    ])
}));
export const isMarketSellOrder = (order: AvailableOrderTypes): order is MarketSellOrder =>
    order.sell === true && [-1, 0].includes(order.limitExtension);

// Limit
const Limit = t.type({
    limitPrice: Price
});

// Limit Buy
export type LimitBuyOrder = t.TypeOf<typeof LimitBuyOrder>
export const LimitBuyOrder = t.exact(t.intersection([Limit, t.type({
    sell: t.literal(false),
    limitExtension: t.union([
        t.literal(-1),
        t.literal(0),
        t.literal(3)
    ])
})]));
export const isLimitBuyOrder = (order: AvailableOrderTypes): order is LimitBuyOrder =>
    order.sell === false && [-1, 0, 3].includes(order.limitExtension) && (order as LimitBuyOrder).limitPrice !== undefined;

// Limit Sell
export type LimitSellOrder = t.TypeOf<typeof LimitSellOrder>
export const LimitSellOrder = t.intersection([Limit, t.type({
    sell: t.literal(true),
    limitExtension: t.union([
        t.literal(-1),
        t.literal(0)
    ])
})]);
export const isLimitSellOrder = (order: AvailableOrderTypes): order is LimitSellOrder =>
    order.sell === true && [-1, 0].includes(order.limitExtension) && (order as LimitSellOrder).limitPrice !== undefined;

// Stop Market
const StopMarket = t.type({
    stopLimit: Price
});

// Stop Market Buy
export type StopMarketBuyOrder = t.TypeOf<typeof StopMarketBuyOrder>
export const StopMarketBuyOrder = t.intersection([StopMarket, t.type({
    sell: t.literal(false),
    limitExtension: t.literal(4)
})]);
export const isStopMarketBuyOrder = (order: AvailableOrderTypes): order is StopMarketBuyOrder =>
    order.sell === false && order.limitExtension === 4 && order.stopLimit !== undefined;

// Stop Market Sell
export type StopMarketSellOrder = t.TypeOf<typeof StopMarketSellOrder>
export const StopMarketSellOrder = t.intersection([StopMarket, t.type({
    sell: t.literal(true),
    limitExtension: t.union([
        t.literal(5),
        t.literal(9)
    ])
})]);
export const isStopMarketSellOrder = (order: AvailableOrderTypes): order is StopMarketSellOrder =>
    order.sell === true && [5, 9].includes(order.limitExtension) && (order as StopMarketSellOrder).stopLimit !== undefined;

// Stop Limit
const StopLimit = t.type({
    stopLimit: Price,
    limitPrice: Price
});

// Stop Limit Buy
export type StopLimitBuyOrder = t.TypeOf<typeof StopLimitBuyOrder>
export const StopLimitBuyOrder = t.intersection([StopLimit, t.type({
    sell: t.literal(false),
    limitExtension: t.literal(6)
})]);
export const isStopLimitBuyOrder = (order: AvailableOrderTypes): order is StopLimitBuyOrder =>
    order.sell === false && order.limitExtension === 6 && (order as StopLimitBuyOrder).stopLimit !== undefined && (order as StopLimitBuyOrder).limitPrice !== undefined;

// Stop Limit Sell
export type StopLimitSellOrder = t.TypeOf<typeof StopLimitSellOrder>
export const StopLimitSellOrder = t.intersection([StopLimit, t.type({
    sell: t.literal(true),
    limitExtension: t.literal(7)
})]);
export const isStopLimitSellOrder = (order: AvailableOrderTypes): order is StopLimitSellOrder =>
    order.sell === true && order.limitExtension === 7 && (order as StopLimitSellOrder).stopLimit !== undefined && (order as StopLimitSellOrder).limitPrice !== undefined;

// Trailing Stop Market
const TrailingStopMarket = t.type({
    stopLimit: Price,
    trailingStopLimit: Price,
    orderType: t.literal("TRS")
});

// Trailing Stop Market Buy
export type TrailingStopMarketBuyOrder = t.TypeOf<typeof TrailingStopMarketBuyOrder>
export const TrailingStopMarketBuyOrder = t.intersection([TrailingStopMarket, t.type({
    sell: t.literal(false),
    limitExtension: t.literal(4)
})]);
export const isTrailingStopMarketBuyOrder = (order: AvailableOrderTypes): order is TrailingStopMarketBuyOrder =>
    order.sell === false && order.limitExtension === 4 && (order as TrailingStopMarketBuyOrder).orderType === "TRS" && (order as TrailingStopMarketBuyOrder).stopLimit !== null && (order as TrailingStopMarketBuyOrder).trailingStopLimit !== null;

// Trailing Stop Market Sell
export type TrailingStopMarketSellOrder = t.TypeOf<typeof TrailingStopMarketSellOrder>
export const TrailingStopMarketSellOrder = t.intersection([TrailingStopMarket, t.type({
    sell: t.literal(true),
    limitExtension: t.literal(5)
})]);
export const isTrailingStopMarketSellOrder = (order: AvailableOrderTypes): order is TrailingStopMarketSellOrder =>
    order.sell === true && order.limitExtension === 5 && (order as TrailingStopMarketSellOrder).orderType === "TRS" && (order as TrailingStopMarketSellOrder).stopLimit !== null && (order as TrailingStopMarketSellOrder).trailingStopLimit !== null;

// Trailing Stop Limit
const TrailingStopLimit = t.type({
    stopLimit: Price,
    // currency: z.B. EUR oder PRZ (%-Abstand)
    trailingStopLimit: Price,
    trailingLimit: Price,
    orderType: t.literal("TRS")
});

// Trailing Stop Limit Buy
export type TrailingStopLimitBuyOrder = t.TypeOf<typeof TrailingStopLimitBuyOrder>
export const TrailingStopLimitBuyOrder = t.intersection([TrailingStopLimit, t.type({
    sell: t.literal(false),
    limitExtension: t.literal(6)
})]);
export const isTrailingStopLimitBuyOrder = (order: AvailableOrderTypes): order is TrailingStopLimitBuyOrder =>
    order.sell === false && order.limitExtension === 6 && (order as TrailingStopLimitBuyOrder).orderType === "TRS" && (order as TrailingStopLimitBuyOrder).trailingStopLimit !== undefined && (order as TrailingStopLimitBuyOrder).trailingLimit !== undefined && (order as TrailingStopLimitBuyOrder).stopLimit !== undefined;

// Trailing Stop Limit Sell
export type TrailingStopLimitSellOrder = t.TypeOf<typeof TrailingStopLimitSellOrder>
export const TrailingStopLimitSellOrder = t.intersection([TrailingStopLimit, t.type({
    sell: t.literal(true),
    limitExtension: t.literal(7)
})]);
export const isTrailingStopLimitSellOrder = (order: AvailableOrderTypes): order is TrailingStopLimitSellOrder =>
    order.sell === true && order.limitExtension === 7 && (order as TrailingStopLimitSellOrder).orderType === "TRS" && (order as TrailingStopLimitSellOrder).trailingStopLimit !== undefined && (order as TrailingStopLimitSellOrder).trailingLimit !== undefined && (order as TrailingStopLimitSellOrder).stopLimit !== undefined;

// OCO Market
const OCOMarket = t.type({
    stopLimit: Price,
    limitPriceOCO: Price,
    orderType: t.literal("OCO")
});

// OCO Market Buy
export type OCOMarketBuyOrder = t.TypeOf<typeof OCOMarketBuyOrder>
export const OCOMarketBuyOrder = t.intersection([OCOMarket, t.type({
    sell: t.literal(false),
    limitExtension: t.literal(4)
})]);
export const isOCOMarketBuyOrder = (order: AvailableOrderTypes): order is OCOMarketBuyOrder =>
    order.sell === false && order.limitExtension === 4 && (order as OCOMarketBuyOrder).orderType === "OCO" && (order as OCOMarketBuyOrder).stopLimit !== undefined && (order as OCOMarketBuyOrder).limitPriceOCO !== undefined;

// OCO Market Sell
export type OCOMarketSellOrder = t.TypeOf<typeof OCOMarketSellOrder>
export const OCOMarketSellOrder = t.intersection([OCOMarket, t.type({
    sell: t.literal(true),
    limitExtension: t.literal(5)
})]);
export const isOCOMarketSellOrder = (order: AvailableOrderTypes): order is OCOMarketSellOrder =>
    order.sell === true && order.limitExtension === 5 && (order as OCOMarketSellOrder).orderType === "OCO" && (order as OCOMarketSellOrder).stopLimit !== undefined && (order as OCOMarketSellOrder).limitPriceOCO !== undefined;

// OCO Limit
export const OCOLimit = t.type({
    stopLimit: Price,
    limitPrice: Price,
    limitPriceOCO: Price,
    orderType: t.literal("OCO")
});

// OCO Limit Buy
export type OCOLimitBuyOrder = t.TypeOf<typeof OCOLimitBuyOrder>
export const OCOLimitBuyOrder = t.intersection([OCOLimit, t.type({
    sell: t.literal(false),
    limitExtension: t.literal(6)
})]);
export const isOCOLimitBuyOrder = (order: AvailableOrderTypes): order is OCOLimitBuyOrder =>
    order.sell === false && order.limitExtension === 6 && (order as OCOLimitBuyOrder).orderType === "OCO" && (order as OCOLimitBuyOrder).stopLimit !== undefined && (order as OCOLimitBuyOrder).limitPriceOCO !== undefined && (order as OCOLimitBuyOrder).limitPrice !== undefined;

export type OCOLimitSellOrder = t.TypeOf<typeof OCOLimitSellOrder>
export const OCOLimitSellOrder = t.intersection([OCOLimit, t.type({
    sell: t.literal(true),
    limitExtension: t.literal(7)
})]);
export const isOCOLimitSellOrder = (order: AvailableOrderTypes): order is OCOLimitSellOrder =>
    order.sell === true && order.limitExtension === 7 && (order as OCOLimitSellOrder).orderType === "OCO" && (order as OCOLimitSellOrder).stopLimit !== undefined && (order as OCOLimitSellOrder).limitPriceOCO !== undefined && (order as OCOLimitSellOrder).limitPrice !== undefined;

export type AvailableOrderTypes = t.TypeOf<typeof AvailableOrderTypes>
export const AvailableOrderTypes = t.union([
    LimitBuyOrder,
    LimitSellOrder,
    MarketBuyOrder,
    MarketSellOrder,
    OCOLimitBuyOrder,
    OCOLimitSellOrder,
    OCOMarketBuyOrder,
    OCOMarketSellOrder,
    StopLimitBuyOrder,
    StopLimitSellOrder,
    StopMarketBuyOrder,
    StopMarketSellOrder,
    TrailingStopLimitBuyOrder,
    TrailingStopLimitSellOrder,
    TrailingStopMarketBuyOrder,
    TrailingStopMarketSellOrder
]);

export interface ProcessPlaceOrderArgs<T extends AvailableOrderTypes> {
    session: Session
    identification: Identification & {
        authenticationMethod: string
        transactionPin: string
        sessionCredential: boolean
    }
    order: {
        depot: Account
        account: Account
        paper: {
            isin: string
        }
        value: Value
        stockExchange: string
        validity: string | undefined
        validityKind: number
    } & T
}

export interface ProcessCancelOrderArgs {
    session: Session
    depot: Account
    identification: Identification & {
        authenticationMethod: string
        transactionPin: string
        sessionCredential: boolean
    }
    orderId: string
}
