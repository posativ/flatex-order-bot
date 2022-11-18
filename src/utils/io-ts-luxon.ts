import * as t from "io-ts";
import { DateTime } from "luxon";
import { either } from "fp-ts/lib/Either";

export const DateTimeFromISOString = new t.Type<DateTime, string, unknown>(
    "DateTimeFromISOString",
    (u): u is DateTime => u instanceof DateTime,
    (u, c) =>
        either.chain(t.string.validate(u, c), (s) => {
            const dt = DateTime.fromISO(s);
            return dt.isValid ? t.success(dt) : t.failure(s, c);
        }),
    (a) => a.toISO()
);
