import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Database } from "./database";
import { DataPackage } from "./datapackage";
import { RefinedHero } from "./refinedhero";
import * as Stochastics from "./stochastics";

export class Refiner {
    database: Database;

    constructor(database: Database) {
        this.database = database;
    }

    refine(): void {
        this.database.loadHeroes();
        let refinedHeroes: {[name: string]: RefinedHero} = {};
        for (let heroId in this.database.heroes) {
            let hero = this.database.heroes[heroId];
            let refinedHero = new RefinedHero(this.database);
            refinedHero.id = hero.id;
            refinedHero.name = hero.name;
            refinedHero.internalName = hero.name.toLowerCase().split(" ").join("_");
            refinedHero.attribute = hero.attribute;
            refinedHero.rankedWinRates = hero.rankedWinRates;
            refinedHero.rankedPickRates = hero.rankedPickRates;
            refinedHeroes[refinedHero.name] = refinedHero;
        }

        let meanLifetimeDays = 10;
        let factors: {[heroName: string]: number[]} = {};
        let dataPackages = DataPackage.loadAll(this.database.heroes);
        for (let heroId in this.database.heroes) {
            let heroName = this.database.heroes[heroId].name;
            factors[heroName] = [];
        }
        for (let i = 0; i < dataPackages.length; ++i) {
            let dataPackage = dataPackages[i];
            let daysPast = dataPackage.day.daysPast();
            let factor = Math.exp(-daysPast / meanLifetimeDays);

            for (let heroName in dataPackage.data) {
                let heroData = dataPackage.data[heroName];
                let gamesPlayed = heroData.totalGamesPlayed;
                let heroFactor = factor * gamesPlayed;
                factors[heroName][i] = heroFactor;
            }
        }
        for (let heroId in this.database.heroes) {
            let heroName = this.database.heroes[heroId].name;
            let sumOfFactors = 0;
            for (let i = 0; i < factors[heroName].length; ++i) {
                let factor = factors[heroName][i] || 0;
                sumOfFactors += factor;
            }
            for (let i = 0; i < factors[heroName].length; ++i) {
                factors[heroName][i] /= sumOfFactors;
            }
        }


        for (let i = 0; i < dataPackages.length; ++i) {
            let dataPackage = dataPackages[i];
            for (let heroName in dataPackage.data) {
                let heroData = dataPackage.data[heroName];
                let refinedHero = refinedHeroes[heroName];
                let totalWinRate = heroData.totalGamesWon / heroData.totalGamesPlayed;
                let weightFactor = factors[heroName][i];

                // farm priority
                for (let priority = 0; priority < 5; ++priority) {
                    let nSamples = heroData.gamesPlayedAsFarmPriority[priority];
                    if (nSamples > 0) {
                        let measuredWinRate = heroData.gamesWonAsFarmPriority[priority] / nSamples;
                        let priorityWinRate = Stochastics.split(measuredWinRate, totalWinRate);
                        refinedHero.farmPrioritySamples[priority] += weightFactor * nSamples;
                        refinedHero.farmPriorityWinRates[priority] += weightFactor * priorityWinRate;
                    }
                    else {
                        refinedHero.farmPrioritySamples[priority] = 0;
                        refinedHero.farmPriorityWinRates[priority] = 0;
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
                    else {
                        refinedHero.xpPrioritySamples[priority] = 0;
                        refinedHero.xpPriorityWinRates[priority] = 0;
                    }
                }

                // synergy
                for (let allyHeroId in this.database.heroes) {
                    let allyHero = this.database.heroes[allyHeroId];
                    let nSamples = heroData.gamesPlayedWith[allyHero.name];
                    if (nSamples > 0) {
                        let allyHeroPackage = dataPackage.data[allyHero.name];
                        let allyWinRate = allyHeroPackage.totalGamesWon / allyHeroPackage.totalGamesPlayed;
                        let expectedWinRate = Stochastics.combine(totalWinRate, allyWinRate);
                        let measuredWinRate = heroData.gamesWonWith[allyHero.name] / nSamples;
                        let synergyWinRate = Stochastics.split(measuredWinRate, expectedWinRate);
                        refinedHero.synergySamples[allyHero.id] += weightFactor * nSamples;
                        refinedHero.synergyWinRates[allyHero.id] += weightFactor * synergyWinRate;
                    }
                    else {
                        refinedHero.synergySamples[allyHero.id] = 0;
                        refinedHero.synergyWinRates[allyHero.id] = 0;
                    }
                }

                // matchup
                for (let enemyHeroId in this.database.heroes) {
                    let enemyHero = this.database.heroes[enemyHeroId];
                    let nSamples = heroData.gamesPlayedAgainst[enemyHero.name];
                    if (nSamples > 0) {
                        let enemyHeroPackage = dataPackage.data[enemyHero.name];
                        let enemyWinRate = enemyHeroPackage.totalGamesWon / enemyHeroPackage.totalGamesPlayed;
                        let expectedWinRate = Stochastics.combine(totalWinRate, 1 - enemyWinRate);
                        let measuredWinRate = heroData.gamesWonAgainst[enemyHero.name] / nSamples;
                        let matchupWinRate = Stochastics.split(measuredWinRate, expectedWinRate);
                        refinedHero.matchUpSamples[enemyHero.id] += weightFactor * nSamples;
                        refinedHero.matchUpWinRates[enemyHero.id] += weightFactor * matchupWinRate;
                    }
                    else {
                        refinedHero.matchUpSamples[enemyHero.id] = 0;
                        refinedHero.matchUpWinRates[enemyHero.id] = 0;
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
}