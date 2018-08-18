export class RefinedHero {
    id: number;
    name: string;
    internalName: string;
    attribute: string;

    rankedPickRates: number[];
    rankedWinRates: number[];
    farmPrioritySamples: number[];
    farmPriorityWinRates: number[];
    xpPrioritySamples: number[];
    xpPriorityWinRates: number[];
    // synergySamples: number[];
    // synergyWinRates: number[];
    // matchUpSamples: number[];
    // matchUpWinRates: number[];

    constructor() {
        this.id = 0;
        this.name = "";
        this.attribute = "";

        this.rankedPickRates = [0, 0, 0, 0, 0];
        this.rankedWinRates = [0, 0, 0, 0, 0];
        this.farmPrioritySamples = [0, 0, 0, 0, 0];
        this.farmPriorityWinRates = [0, 0, 0, 0, 0];
        this.xpPrioritySamples = [0, 0, 0, 0, 0];
        this.xpPriorityWinRates = [0, 0, 0, 0, 0];
    }
}