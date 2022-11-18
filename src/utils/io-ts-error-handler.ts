import { isDecodeError } from "io-ts-promise";
import { formatValidationErrors } from "io-ts-reporters";

export const handleDecodeError = ((e: unknown) => {
    if (isDecodeError(e)) {
        throw new Error(formatValidationErrors(e.errors)[0]);
    }

    throw e;
});
