import { microservice } from 'starburst';
import fs from 'fs';
import { promisify } from 'util';
const writeFile = promisify(fs.writeFile);


@microservice({serviceName:'write service'})
export class WriterService {
    async writeToFile(text: string) {
        await writeFile('output.txt', text);
        console.log('done');
        return 'done';
    }
}

export type Args = {
    num: number,
}
