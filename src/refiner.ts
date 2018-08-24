import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Database } from "./database";
import { DataPackage } from "./datapackage";
import { RefinedHero } from "./refinedhero";
import * as Stochastics from "./stochastics";

export function refine(database: Database): void {
    let refinedHeroes: {[name: string]: RefinedHero} = {};
    for (let heroId in database.heroes) {
        let hero = database.heroes[heroId];
        let refinedHero = new RefinedHero();
        refinedHero.id = hero.id;
        refinedHero.name = hero.name;
        refinedHero.internalName = hero.name.toLowerCase().split(" ").join("_");
        refinedHero.attribute = hero.attribute;
        refinedHeroes[refinedHero.name] = refinedHero;
    }

    let meanLifetimeDays = 30;
    let sumOfFactors = 0;
    let factors: number[] = [];
    let dataPackages = DataPackage.loadAll(database.heroes);
    dataPackages.forEach((dataPackage) => {
        let daysPast = dataPackage.day.daysPast();
        let factor = Math.exp(-daysPast / meanLifetimeDays);
        sumOfFactors += factor;
        factors.push(factor);
    });
    for (let i = 0; i < factors.length; ++i) {
        factors[i] /= sumOfFactors;
    }

    for (let i = 0; i < dataPackages.length; ++i) {
        let dataPackage = dataPackages[i];
        let weightFactor = factors[i];
        for (let heroName in dataPackage.data) {
            let heroData = dataPackage.data[heroName];
            let refinedHero = refinedHeroes[heroName];
            let totalWinRate = heroData.totalGamesWon / heroData.totalGamesPlayed;

            // farm priority
            for (let priority = 0; priority < 5; ++priority) {
                let nSamples = heroData.gamesPlayedAsFarmPriority[priority];
                if (nSamples > 0) {
                    let measuredWinRate = heroData.gamesWonAsFarmPriority[priority] / nSamples;
                    let priorityWinRate = Stochastics.split(measuredWinRate, totalWinRate);
                    refinedHero.farmPrioritySamples[priority] += weightFactor * nSamples;
                    refinedHero.farmPriorityWinRates[priority] += weightFactor * priorityWinRate;
                }
            }

            // xp priority
            for (let priority = 0; priority < 5; ++priority) {
                let nSamples = heroData.gamesPlayedAsXPPriority[priority];
                if (nSamples > 0) {
                    let measuredWinRate = heroData.gamesWonAsXPPriority[priority] / nSamples;
                    let priorityWinRate = Stochastics.split(measuredWinRate, totalWinRate);
                    refinedHero.xpPrioritySamples[priority] += weightFactor * nSamples;
                    refinedHero.xpPriorityWinRates[priority] += weightFactor * priorityWinRate;
                }
            }
        }
    };
    
    let directory = "refined";
    if (!existsSync(directory)) {
        mkdirSync(directory);
    }
    let heroList: RefinedHero[] = [];
    for (let heroName in refinedHeroes) {   
        heroList.push(refinedHeroes[heroName]);
    }
    writeFileSync(directory + "/heroes.json", JSON.stringify(heroList, null, 2));
}