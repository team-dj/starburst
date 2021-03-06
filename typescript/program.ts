import { microservice } from 'starburst';
import { Args, WriterService } from './otherfile';

interface Thing {
    yo: 123
}

const globalVar = 5;

function myadd(a: number, b : number) { return a + b }

class MyStuff {
    @microservice()
    incrementBySomeAmount(args: Args) {
        const ret = {
            'yo': myadd(args.num, 3) + globalVar
        } as Thing
        new WriterService().writeToFile(ret.toString()).then(r => console.log('response: ', r));
        return ret;
    }
}

async function main() {
    await new Promise(r => setTimeout(r, 2000)); // wait 2 seconds
    const ret = new MyStuff().incrementBySomeAmount({num:5});  // do RPC
    console.log(ret);                            // print result
}
main();
