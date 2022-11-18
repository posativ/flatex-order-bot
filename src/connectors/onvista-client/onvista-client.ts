import { AxiosInstance, default as axios } from "axios";
import {
    DerivativesFinderResponse,
    EntitySubType,
    EntityType,
    SearchResponse,
    SnapshotResponse,
    tryDecodeOnvista
} from "./onvista-response";
import { DerivativesFinderRequest, SearchRequest } from "./onvista-request";

const EntityTypeMapping: Record<EntityType, string> = {
    BASKET: "baskets",
    BOND: "bonds",
    COMMODITY: "commodities",
    CURRENCY: "currencies",
    DERIVATIVE: "derivatives",
    FUND: "funds",
    FUTURE: "futures",
    INDEX: "indices",
    OPTION: "options",
    PRECIOUS_METAL: "precious_metals",
    STOCK: "stocks",
};

export class OnvistaError extends Error {
    constructor(public readonly code: number, public readonly message: string) {
        super(`${code}: ${message}`);
    }
}

export interface DerivativesFinderConfiguration {
    type: EntityType
    value: string
    entitySubType?: EntitySubType,
    exerciseRight: "PUT" | "CALL"
    gearingAskRange?: [number, number]
    knockOutAbsRange?: [number, number]
    feature?: ("STANDARD" | "STOP_LOSS" | "SMART_TURBO" | "OTC_KO")[]
    page?: number
    perPage?: number
}

export class OnvistaApiClient {

    private readonly httpClient: AxiosInstance;

    constructor(onvistaUrl: string) {
        this.httpClient = axios.create({
            baseURL: onvistaUrl,
            timeout: 5000,
            validateStatus: status => {
                return (status >= 200 && status < 300) || (status >= 400 && status < 500);
            }
        });
    }

    search(value: string, limit: number = 1): Promise<SearchResponse> {
        const params: SearchRequest = {
            searchValue: value,
            limit: limit.toString()
        };
        return this.httpClient
            .get("/api/v1/instruments/query", {
                params: params
            })
            .then(response => response.data)
            .then(tryDecodeOnvista(SearchResponse));
    }

    snapshot(request: { entityType: EntityType, entityValue: string }): Promise<SnapshotResponse> {
        return this.httpClient
            .get(`/api/v1/${EntityTypeMapping[request.entityType]}/${request.entityValue}/snapshot`)
            .then(response => response.data)
            .then(tryDecodeOnvista(SnapshotResponse));
    }

    derivativesFinder(request: DerivativesFinderConfiguration): Promise<DerivativesFinderResponse> {
        const queryParameters = [
            `entitySubType=${request.entitySubType ?? "KNOCKOUT_CERTIFICATE"}`,
            `idExerciseRight=${request.exerciseRight === "PUT" ? 1 : 2}`,
        ];
        if (request.knockOutAbsRange) {
            queryParameters.push(`knockOutAbsRange=${request.knockOutAbsRange[0]};${request.knockOutAbsRange[1]}`);
        }
        if (request.gearingAskRange) {
            queryParameters.push(`gearingAskRange=${request.gearingAskRange[0]};${request.gearingAskRange[1]}`);
        }
        if (request.feature) {
            queryParameters.push(`feature=${request.feature.join(",")}`);
        }

        const params: DerivativesFinderRequest = {
            entityTypeUnderlying: request.type,
            entityValueUnderlying: request.value,
            page: `${request.page ?? 0}`,
            perPage: `${request.perPage ?? 100}`,
            queryParameters: queryParameters.join("%26")
        };
        return this.httpClient
            .get("/api/v1/derivatives/finder/configuration_query", {
                params: params
            })
            .then(response => response.data)
            .then(tryDecodeOnvista(DerivativesFinderResponse));
    }
}
