import { microservice } from 'constellation';

interface Thing {
    yo: 123
}

const globalVar = 5;

function myadd(a: number, b : number) { return a + b }

@microservice('increment service')
function incrementBySomeAmount(x: number) {
    return {
        'yo': myadd(x, 3) + globalVar
    } as Thing
}

async function main() {
    await new Promise(r => setTimeout(r, 2000)); // wait 2 seconds
    const ret = incrementBySomeAmount(5);                   // do RPC
    console.log(ret);                            // print result
}
main();
