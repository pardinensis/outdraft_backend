export class RefinedHero {
    static N_IDS: number = 122;

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

    synergySamples: number[];
    synergyWinRates: number[];
    matchUpSamples: number[];
    matchUpWinRates: number[];

    constructor() {
        this.id = 0;
        this.name = "";
        this.internalName = "";
        this.attribute = "";

        this.rankedPickRates = [0, 0, 0, 0, 0];
        this.rankedWinRates = [0, 0, 0, 0, 0];
        this.farmPrioritySamples = [0, 0, 0, 0, 0];
        this.farmPriorityWinRates = [0, 0, 0, 0, 0];
        this.xpPrioritySamples = [0, 0, 0, 0, 0];
        this.xpPriorityWinRates = [0, 0, 0, 0, 0];

        this.synergySamples = new Array<number>(RefinedHero.N_IDS);
        this.synergyWinRates = new Array<number>(RefinedHero.N_IDS);
        this.matchUpSamples = new Array<number>(RefinedHero.N_IDS);
        this.matchUpWinRates = new Array<number>(RefinedHero.N_IDS);
        for (let id = 0; id < RefinedHero.N_IDS; ++id) {
            this.synergySamples[id] = 0;
            this.synergyWinRates[id] = 0;
            this.matchUpSamples[id] = 0;
            this.matchUpWinRates[id] = 0;
        }
    }
}