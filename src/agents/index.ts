import { FlatexService } from "../services/flatex-service";
import { MatrixService } from "../services/matrix-service";

export class AttachedOrderAgent {

    private constructor(
        private flatex: FlatexService,
        private matrix: MatrixService
    ) {
    }
}
