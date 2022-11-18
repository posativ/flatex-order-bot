import * as t from "io-ts";

export const SearchRequest = t.type({
    searchValue: t.string,
    limit: t.string
});
export type SearchRequest = t.TypeOf<typeof SearchRequest>

export const DerivativesFinderRequest = t.type({
    entityTypeUnderlying: t.string,
    entityValueUnderlying: t.string,
    page: t.string,
    perPage: t.string,
    queryParameters: t.string
});
export type DerivativesFinderRequest = t.TypeOf<typeof DerivativesFinderRequest>
