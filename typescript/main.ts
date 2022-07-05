import * as ts from "typescript";
import _ from 'lodash';
import fs from "fs";
import {promisify} from 'util';
import { printChildren } from "./util";
import assert, { AssertionError } from "assert";
import path from 'path';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

const parsed = ts.readConfigFile(ts.findConfigFile(__dirname, ts.sys.fileExists)!, ts.sys.readFile);
const program = ts.createProgram(['program.ts'], parsed.config!);
const typeChecker = program.getTypeChecker();

// Get the checker, we will use it to find more about classes
async function main() {
    for (const sourceFile of program.getSourceFiles()) {
        if(!sourceFile.isDeclarationFile) {
            console.log(sourceFile.fileName)
            for(let node of sourceFile.getChildren()) {
                await visit(node);
            }
        }
    }
    console.log('done');
}

type Args = {
    service: string
};

function parseArgs(rawArgs: ts.NodeArray<ts.Expression>, rootDecl: ts.MethodDeclaration | ts.ClassDeclaration): Args {
    assert(rawArgs.length <= 1, "Too many arguments provided to @microservice()");
    const argsObj = rawArgs[0] as ts.ObjectLiteralExpression | undefined;
    if(rawArgs.length === 1) assert(argsObj && ts.isObjectLiteralExpression(argsObj), "Only argument for @microservice() should be an object containing options");
    function getVal(key: string) : string | undefined {
        if(argsObj) {
            const property = (argsObj.properties.find(prop => prop.name?.getText() === key) as ts.PropertyAssignment)?.initializer;
            switch(property?.kind) {
                case undefined:
                    return undefined;
                case ts.SyntaxKind.StringLiteral:
                    return property.getText().replace(/^['"](.*)['"]$/, '$1');
            }
            if(property) return property.getText();
        }
        return undefined;
    }
    return {
        service: getVal('serviceName') ?? rootDecl.name!.getText(),
    };
}

function generateName(nameIn: string, serviceName: string) {
    nameIn = path.resolve(nameIn);
    const dot = nameIn.lastIndexOf('.');
    const slash = nameIn.lastIndexOf('/');
    assert(slash < dot);
    const [fullPath, extension] = [nameIn.slice(0, dot), nameIn.slice(dot)];
    const [parentDir, fileName] = [fullPath.slice(0, slash), fullPath.slice(slash)];
    const nameOut =  parentDir + "/generated" + fileName + "_" + _.kebabCase(serviceName) + extension;
    const newDirectory = parentDir + "/generated";
    return [nameOut, newDirectory];
}

function mapToGrpc(rootDecl: ts.MethodDeclaration | ts.ClassDeclaration) {
    const funcType = typeChecker.getTypeAtLocation(rootDecl);
    function parse(type: ts.Type) {
        // console.log('parse: ', type.getSymbol()?.getName())
    }
    parse(funcType);
}

/** Finds a parent of `node` that has parent.kind === `kind` */
function findParent(node: ts.Node, kind: ts.SyntaxKind) {
    if(kind === undefined) return undefined;
    let cur = node;
    while(cur && cur.kind !== kind) {
        cur = cur.parent;
    }
    return cur;
}

const parentMap: {[k: number]: ts.SyntaxKind} = {
    [ts.SyntaxKind.ImportSpecifier]: ts.SyntaxKind.ImportDeclaration,
    [ts.SyntaxKind.ImportClause]: ts.SyntaxKind.ImportDeclaration,
    [ts.SyntaxKind.VariableDeclaration]: ts.SyntaxKind.FirstStatement,
    [ts.SyntaxKind.MethodDeclaration]: ts.SyntaxKind.ClassDeclaration,
};

/** 
 * Returns all the statements that need to be included in a binary where `funcDecl` is the root */
function* treeShake(node: ts.Node, args: Args, visited: Set<ts.Node> = new Set()): Iterable<ts.Node> {
    if(node.getSourceFile().isDeclarationFile) return;
    if(visited.has(node)) return;
    visited.add(node);
    yield node;
    
    const parent = findParent(node, parentMap[node.kind]);
    if(parent) { yield* treeShake(parent, args, visited) }

    if(ts.isImportSpecifier(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node.name)!;
        const aliasedSymbol = typeChecker.getAliasedSymbol(symbol);
        for(let decl of aliasedSymbol.getDeclarations() ?? []) {
            yield* treeShake(decl, args, visited);
        }
    }
    if(ts.isIdentifier(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node);
        if(symbol) {
            const declarationSymbols = typeChecker.getRootSymbols(symbol);
            for(let decl of declarationSymbols.flatMap(s => s.getDeclarations() ?? [])) {
                yield* treeShake(decl, args, visited);
            }
        }
    }

    // console.log('treeShake: ', ts.SyntaxKind[node.kind], node.getText());
    for(let c of node.getChildren()) {
        yield* treeShake(c, args, visited);
    }
}

/** tree shake files and save a copy to {file}_{microservice_name}.ts */
async function partitionFiles(rootDecl: ts.MethodDeclaration | ts.ClassDeclaration, args: Args) {
    const fileRegex = /(?<=\/|^)([^/]+)\.([^./]+)$/;
    let fileToText = new Map<string, string[]>();
    for (let node of treeShake(rootDecl, args)) {
        let fileText = fileToText.get(node.getSourceFile().fileName);
        if(!fileText) {
            fileText = node.getSourceFile().getText().split('').map(c => c.match(/\s/) ? c : ' ');
            fileToText.set(node.getSourceFile().fileName, fileText);
        }
        let textSegment = node.getText();
        // TODO: figure out the different prefix patterns from tsconfig.json (not just ".")
        if(ts.isStringLiteral(node) && ts.isImportDeclaration(node.parent) && ['.'].some(s => node.getText().slice(1).startsWith(s))) {
            const isSameFolder = textSegment.match(/^['"]\.\/[^./'"]+['"]$/);
            const newText = textSegment.replace(/(?<=\/)([^/]+)(?=['"])/, `${isSameFolder ? '' : 'generated/'}$1_${args.service}`);
            fileText[node.getStart()] = newText;
            for(let i = node.getStart()+1; i < node.getEnd(); i++) fileText[i] = ''; // fill with empty
        } else {
            for(let i = node.getStart(); i < node.getEnd(); i++) {
                fileText[i] = textSegment[i - node.getStart()];
            }
        }
    }
    const promises = [];
    for(const [fileName, fileText] of fileToText) {
        const [newFile, newDirectory] = generateName(fileName, args.service);
        promises.push((async () => {
            if(!await exists(newDirectory)) await mkdir(newDirectory, { recursive: true });
            await writeFile(newFile, fileText.join('').replaceAll(/\n +(?=\n)/g, '\n'));
        })());
    }
    await Promise.all(promises);
}

function assertImportedFromStarburst(identifier: ts.Identifier) {
    const symbol = typeChecker.getSymbolAtLocation(identifier);
    assert(symbol);
    const identifierDecls = typeChecker.getRootSymbols(symbol).flatMap(s => s.getDeclarations() ?? []);
    assert(identifierDecls.length === 1);
    const importSpecifier = identifierDecls[0];
    assert(ts.isImportSpecifier(importSpecifier) || ts.isImportClause(importSpecifier));
    const importDecl = findParent(importSpecifier, ts.SyntaxKind.ImportDeclaration);
    assert(importDecl && ts.isImportDeclaration(importDecl));
    assert(importDecl.moduleSpecifier.getText(), "starburst");
}

function isStarburstDecorator(decorator: ts.Decorator): boolean {
    try {
        assert(decorator && ts.isDecorator(decorator));
        const isCallExpression = ts.isCallExpression(decorator.expression);
        const expr = isCallExpression ? decorator.expression.expression : decorator.expression;
        const isAllowedSyntax = expr.getText() === 'starburst.microservice' || expr.getText() === 'microservice';

        // check that the root identifier (either `microservice` or `starburst`) is directly imported from starburst module
        let identifier: ts.Node = expr;
        while(ts.isPropertyAccessExpression(identifier)) {
            identifier = identifier.getChildAt(0);
        }
        assert(ts.isIdentifier(identifier));
        assertImportedFromStarburst(identifier);

        // if it gets this far these checks don't pass... it's probably a typo / misreading the docs
        assert(isCallExpression, `Starburst found ${decorator.getText()} when it was searching for microservices, you sure this shouldn't be ${decorator.getText()}()?`);
        assert(isAllowedSyntax, `Starburst requires that you either use @starbust.microservice() or @microservice() directly (for readability, and because it's easier for Starburst to parse)`);
    } catch(err) {
        if(err instanceof AssertionError) {
            if(err.generatedMessage) console.warn(err.message);
            return false;
        }
        throw err;
    }
    return true;
}

async function visit(node: ts.Node) {
    let partitionPromise;
    if(ts.isDecorator(node) && isStarburstDecorator(node)) {
        assert(ts.isCallExpression(node.expression)); // guaranteed, since we checked in isStarburstDecorator
        assert(ts.isMethodDeclaration(node.parent) || ts.isClassDeclaration(node.parent), "Starburst @microservice() can only be attached to classes and methods in Typescript (this is a limitation of Typescript's current language spec)");
        const args = parseArgs(node.expression.arguments, node.parent);
        mapToGrpc(node.parent);
        partitionPromise = partitionFiles(node.parent, args);
    }
    for(const child of node.getChildren()) {
        await visit(child);
    }
    await partitionPromise;
}


main();
