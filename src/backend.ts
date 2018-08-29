import { Parser } from "./parser";
import { Database } from "./database";
import { Refiner } from "./refiner";
import { Scraper } from "./scraper";

function startPeriodicTask(name: string, task: ()=>void, seconds: number) {
    console.log("executing: " + name);
    task();
    setInterval(() => {
        console.log("executing: " + name);
        task();
    }, seconds * 1000);
}


let database = new Database();

let parser = new Parser(database);
startPeriodicTask("retrieve matches", parser.requestMatches.bind(parser), 10);

let refiner = new Refiner(database);
startPeriodicTask("refine data", refiner.refine.bind(refiner), 3600);

// let scraper = new Scraper(database);
// scraper.scrapeMeta();
