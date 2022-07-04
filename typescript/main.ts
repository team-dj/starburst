import * as ts from "typescript";
import assert from "assert";

let program = ts.createProgram(['program.ts'], {  });

// Get the checker, we will use it to find more about classes
let typeChecker = program.getTypeChecker();
for (const sourceFile of program.getSourceFiles()) {
    if(!sourceFile.isDeclarationFile) {
        console.log(sourceFile.fileName)
        ts.forEachChild(sourceFile, visit);
    }
}

type Args = {
    service: string
};

function parseArgs(rawArgs?: ts.NodeArray<ts.Expression>): Args {
    return { service: 'abc' };
}

function mapToGrpc(funcDecl: ts.FunctionDeclaration) {
    const funcType = typeChecker.getTypeAtLocation(funcDecl);
    function parse(type: ts.Type) {
        
        // console.log('parse: ', type.getSymbol()?.getName())
        
    }
    parse(funcType);
}

/** Helper for exploring the typescript AST */
function resolveFlags(symbol: ts.Symbol) {
    let remainingFlags = symbol.getFlags();
    const res = [];
    for(let flag in ts.SymbolFlags) {
        if(isNaN(parseInt(flag, 10))) continue;
        if(remainingFlags & parseInt(flag, 10)) {
            res.push(ts.SymbolFlags[flag]);
            remainingFlags &= ~parseInt(flag, 10);
        }
    }
    assert(remainingFlags === 0);
    return res;
}

/** 
 * Returns all the statements that need to be included in a binary where `funcDecl` is the root */
function* treeShake(node: ts.Node, args: Args, visited: Set<ts.Node> = new Set()): Iterable<string> {
    if(visited.has(node)) return;
    visited.add(node);

    if(ts.isIdentifier(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node);
        assert(symbol, `Couldn't find symbol for ${node.getText()}`);
        const declarationSymbols = typeChecker.getRootSymbols(symbol);
        for(let decl of declarationSymbols.flatMap(s => s.getDeclarations() ?? [])) {
            yield* treeShake(decl, args, visited);
        }
    }

    yield "";
    console.log('treeShake: ', ts.SyntaxKind[node.kind], node.getText());
    for(let c of node.getChildren()) {
        yield* treeShake(c, args, visited);
    }
    // switch(node.kind) {
    //     case ts.SyntaxKind.FunctionDeclaration:
    //         break
    //     default:
    //         break
    // }
}

function visit(node: ts.Node) {
    // if(node.kind === ts.SyntaxKind.FunctionDeclaration) {
    //     let funcDeclaration = node as ts.FunctionDeclaration;
    //     const functionType = typeChecker.getTypeAtLocation(funcDeclaration);
    //     const properties = functionType.getCallSignatures().flatMap(c => c.getReturnType().getProperties());
    //     for (const prop of properties) {
    //         const name = prop.getName();
    //         const type = ts.TypeFlags[typeChecker.getTypeOfSymbolAtLocation(prop, funcDeclaration).flags];
    //         console.log(name, type);
    //     }
    // }
    if(node.kind === ts.SyntaxKind.Decorator) {
        const decorator = node as ts.Decorator;
        const funcDecl = decorator.parent as ts.FunctionDeclaration;
        const args = parseArgs((decorator.expression as ts.CallExpression)?.arguments);
        mapToGrpc(funcDecl);
        
        for (let node of treeShake(funcDecl, args)) {
            
        }
    }
    ts.forEachChild(node, visit);
}


