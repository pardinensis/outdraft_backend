import * as RequestAPI from "request-promise-native";
import { Day } from "./day";
import { Database } from "./database";
import { DataPackage } from "./datapackage";


export class Parser {
    GET_HEROES: string = "https://api.steampowered.com/IEconDOTA2_570/GetHeroes/v1/?";
    GET_MATCHES: string = "https://api.steampowered.com/IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/?";
    
    database : Database;
    currentMatchSeqNum : number;
    steamAPIKey: string;

    constructor(steamAPIKey: string, startMatchSeqNum: number) {
        this.database = new Database();
        this.currentMatchSeqNum = startMatchSeqNum;
        this.steamAPIKey = steamAPIKey;
    }

    isValid(match: any): boolean {
        // check number of players that have picked heroes
        if (match.players.length != 10) {
            return false;
        }
        for (let i = 0; i < 10; ++i) {
            if (!(match.players[i].hero_id > 0)) {
                return false;
            }
        }

        // check leaver status
        for (let i = 0; i < 10; ++i) {
            if (match.players[i].leaver_status != 0) {
                return false;
            }
        }

        // check game length
        if (match.duration < 600) {
            return false;
        }
        
        // check if lobby type is ranked
        if (match.lobby_type != 7) {
            return false;
        }

        return true;
    }

    parseWinRate(match: any, dataPackage: DataPackage) {
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            for (let playerIdx = 0; playerIdx < 5; ++playerIdx) {
                let player = match.players[teamIdx * 5 + playerIdx];
                let heroId = player.hero_id;
                let hero = this.database.heroes[heroId];
                let heroData = dataPackage.data[hero.name];
                heroData.totalGamesPlayed++;
                if (won) {
                    heroData.totalGamesWon++;
                }
            }
        }
    }

    parseFarmPriorities(match: any, dataPackage: DataPackage) {
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            let farm: [number, number][] = [];
            for (let playerIdx = 0; playerIdx < 5; ++playerIdx) {
                let player = match.players[teamIdx * 5 + playerIdx];
                farm.push([player.last_hits, player.hero_id]);
            }
            farm.sort((a: [number, number], b: [number, number]) => {
                return a[0] - b[0];
            });
            for (let farmIdx = 0; farmIdx < 5; ++farmIdx) {
                let heroId = farm[farmIdx][1];
                let hero = this.database.heroes[heroId];
                let heroData = dataPackage.data[hero.name];
                heroData.gamesPlayedAsFarmPriority[farmIdx]++;
                if (won) {
                    heroData.gamesWonAsFarmPriority[farmIdx]++;
                }
            }
        }
    }

    parseXPPriorities(match: any, dataPackage: DataPackage) {
        let levelYardstick = 10;
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            let xp: [number, number][] = [];
            for (let playerIdx = 0; playerIdx < 5; ++playerIdx) {
                let player = match.players[teamIdx * 5 + playerIdx];
                let upgrades: any[] = player.ability_upgrades;
                if (upgrades.length < levelYardstick) {
                    return; // not everyone got the desired level
                }
                let upgradeTime = upgrades[levelYardstick - 1].time;
                xp.push([upgradeTime, player.hero_id]);
            }
            xp.sort((a: [number, number], b: [number, number]) => {
                return b[0] - a[0];
            });
            for (let xpIdx = 0; xpIdx < 5; ++xpIdx) {
                let heroId = xp[xpIdx][1];
                let hero = this.database.heroes[heroId];
                let heroData = dataPackage.data[hero.name];
                heroData.gamesPlayedAsXPPriority[xpIdx]++;
                if (won) {
                    heroData.gamesWonAsXPPriority[xpIdx]++;
                }
            }
        }
    }

    parseMatch(match: any): Day {
        let day = new Day(match.start_time);
        let dataPackage = this.database.getPackage(day);
        dataPackage.dirty = true;

        this.parseWinRate(match, dataPackage);
        this.parseFarmPriorities(match, dataPackage);
        this.parseXPPriorities(match, dataPackage);

        return day;
    }


    parseMatches(data: any): void {
        if (data.result === undefined) {
            console.log(data);
        }
        let matchArray: any[] = data.result.matches;
        console.log(matchArray.length);
        matchArray.forEach(match => {
            if (this.isValid(match)) {
                this.parseMatch(match);
            }

            if (match.match_seq_num !== undefined) {
                this.currentMatchSeqNum = match.match_seq_num + 1;
            }
        });

        this.database.saveToDisk();
    }

    requestURI(uri: string, dataSink: (data: any) => void) : void {
        RequestAPI.get(uri, {}, (error: any, response: any, body: any) => {
            dataSink(JSON.parse(body));
        });
    }

    requestMatches(): void {
        let uri = this.GET_MATCHES + "key=" + this.steamAPIKey + "&matches_requested=100&start_at_match_seq_num=" + this.currentMatchSeqNum + "L";
        this.requestURI(uri, this.parseMatches.bind(this));
    }
}