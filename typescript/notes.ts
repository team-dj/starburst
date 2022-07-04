/**
 * This is what I showed Jenita in an example.
 * They're very rough notes.
 */


interface Thing {
    yo: 123
}



// some function that isn't an entrypoint
function add(a: number, b : number) { return a + subtract(b, 1) }

// entrypoint
@microservice('hello world')
function mymicro(x: number) {
    return {
        'yo': add(x, 3)
    } as Thing
}

@microservice('other', { isMain: true })
function otherFunction() {
    const ret = mymicro(5);
}


// // hello-world-microservice_program.ts
// function add(a: number, b : number) { return a + subtract(b, 1) }

// @microservice('hello world')
// function mymicro(x: number) {
//     return {
//         'yo': add(x, 3)
//     } as Thing
// }

// // other-microservice_program.ts
// function mymicro() {
//     doGrpcCall(url_of_hello_world)
// }

// @microservice('other', { isMain: true })
// function otherFunction() {
//     const ret = mymicro(5);
// }
// otherFunction();

// // hello-world-microservice.proto
// service HelloWorld {
//     rpc mymicro(int32) returns (Thing)
// }
// message Thing {
//     int32 yo = 1;
// }

// we do sourcefile => protobuf
// google does protobuf => types for the next sourcefile

// hello-world-microservice.Dockerfile
// hello-world-microservice.yaml <-- kubernetes



// Requirements:
// * microservices cli
// * @microservice decorator
// * statically typed language

// Gazelle <-- generates things in a way that you can modify

// $ microservices build
// ### protobuf files have been generated
// ### docker images have been built
// ### kubernetes manifests have been generated
// ### you're ready to go!

// $ microservices deploy
// ### kuberentes is deploying your microservice
