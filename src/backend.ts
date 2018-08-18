import { Parser } from "./parser";
import { Database } from "./database";
import { refine } from "./refiner";
import * as Stochastics from "./stochastics";

function startPeriodicTask(name: string, task: ()=>void, seconds: number) {
    console.log("executing: " + name);
    task();
    setInterval(() => {
        console.log("executing: " + name);
        task();
    }, seconds * 1000);
}


let parser = new Parser();
startPeriodicTask("retrieve matches", parser.requestMatches.bind(parser), 10);

let database = new Database();
startPeriodicTask("refine data", refine.bind(null, database), 3600);
