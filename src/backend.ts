import { Parser } from "./parser";
import { Database } from "./database";
import { Refiner } from "./refiner";

function startPeriodicTask(name: string, task: ()=>void, seconds: number, initialDelay: number) {
    setTimeout(() => {
        console.log("executing: " + name);
        task();
        setInterval(() => {
            console.log("executing: " + name);
            task();
        }, seconds * 1000);
    }, initialDelay * 1000);
}


let database = new Database();
let parser = new Parser(database);
let refiner = new Refiner(database);

startPeriodicTask("retrieve heroes", parser.requestHeroes.bind(parser), 12 * 3600, 0);
startPeriodicTask("refine data", refiner.refine.bind(refiner), 3600, 10);
startPeriodicTask("retrieve matches", parser.requestMatches.bind(parser), 10, 15);
