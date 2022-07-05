import assert from "assert";
import * as ts from 'typescript';

/** Debugging helper for exploring the typescript AST */
export function resolveFlags(symbol: ts.Symbol) {
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

/** Debugging helper for exploring the typescript AST */
export function printParents(node: ts.Node) {
    let cur = node;
    while(cur) {
        console.log('parents: ', ts.SyntaxKind[cur.kind], cur.getText());
        cur = cur.parent;
    }
}

/** Debugging helper for exploring the typescript AST */
export function printChildren(node: ts.Node) {
    console.log('children: ', ts.SyntaxKind[node.kind], node.getText());
    for(const child of node.getChildren()) {
        printChildren(child);
    }
}
