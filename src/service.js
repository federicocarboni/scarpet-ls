import * as lsp from 'vscode-languageserver/node.js';
import {parseScript} from 'scarpet-parser';

export class ScarpetDocument {
    /**
     * @param {string} text
     * @param {lsp.Connection} conn
     */
    constructor(text, conn) {
        this.conn = conn;
        /** @type {import('scarpet-parser').Diagnostic[]} */
        this.diagnostics = [];
        /** @type {Map<string, import('scarpet-parser').BinaryExpression>} */
        this.globalVariables = new Map();
        /** @type {Map<string, import('scarpet-parser').BinaryExpression>} */
        this.globalScope = new Map();
        /** @type {Map<string, import('scarpet-parser').FunctionDeclaration>} */
        this.functions = new Map();
        /** @type {WeakMap<import('scarpet-parser').Node, Map<string, import('scarpet-parser').BinaryExpression>>} */
        this.scopes = new WeakMap();
        this.root = parseScript(text, {diagnostics: this.diagnostics, onComment: (token) => this.conn.console.debug(JSON.stringify(token))});
        this.fillScopes();
    }

    /**
     * @param {string} text
     */
    onChange(text) {
        this.diagnostics = [];
        this.root = parseScript(text, {diagnostics: this.diagnostics, onComment: (token) => this.conn.console.debug(JSON.stringify(token))});
        this.globalVariables = new Map();
        this.globalScope = new Map();
        this.functions = new Map();
        this.scopes = new WeakMap();
        this.fillScopes();
    }

    fillScopes(node = this.root, scope = this.globalScope) {
        this.conn.console.debug('filling scopes');
        if (node !== null) {
            switch (node.kind) {
                case 'BinaryExpression':
                    if (
                        node.operator === '->' &&
                        node.lvalue.kind === 'FunctionExpression'
                    ) {
                        // this.conn.console.debug('function decl')
                        // this.functions.set(node.lvalue.name, node);
                        // const newScope = new Map();
                        // this.scopes.set(node, newScope);
                        // for (const param of node.lvalue.params) {
                        //     switch (param?.kind) {
                        //         case 'Variable':
                        //             newScope.set(param.name, param);
                        //             break;
                        //         case 'UnaryExpression':
                        //             if (
                        //                 param.operator === '...' &&
                        //                 param.value?.kind === 'Variable'
                        //             )
                        //                 newScope.set(param.value.name, param);
                        //             break;
                        //         case 'FunctionExpression': {
                        //             if (param.name !== 'outer') break;
                        //             const va = param.params.find(
                        //                 (node) => node?.kind === 'Variable',
                        //             );
                        //             if (va !== void 0) {
                        //                 newScope.set(
                        //                     /** @type {import('scarpet-parser/types/Parser').Variable} */ (
                        //                         va
                        //                     ).name,
                        //                     va,
                        //                 );
                        //             }
                        //         }
                        //     }
                        // }
                        // this.fillScopes(node.rvalue, newScope);
                    } else if (
                        node.operator === '=' &&
                        node.lvalue.kind === 'Variable'
                    ) {
                        if (node.lvalue.name.startsWith('global_')) {
                            if (!this.globalVariables.has(node.lvalue.name))
                                this.globalVariables.set(
                                    node.lvalue.name,
                                    node,
                                );
                        } else {
                            scope.set(node.lvalue.name, node);
                        }
                        this.fillScopes(node.rvalue, scope);
                    } else {
                        this.fillScopes(node.lvalue, scope);
                        this.fillScopes(node.rvalue, scope);
                    }
                    break;
                case 'FunctionDeclaration':
                    // this.conn.console.debug(JSON.stringify(node));
                    if (node.name !== null)
                        this.functions.set(node.name.value, node);
                    break;
                case 'UnaryExpression':
                case 'ParenthesisedExpression':
                    this.fillScopes(node.value, scope);
                    break;
                case 'FunctionExpression':
                case 'ListLiteral':
                case 'MapLiteral':
                    for (const param of node.params) {
                        this.fillScopes(param, scope);
                    }
                    break;
                default:
            }
        }
    }

    // /**
    //  * @param {number} offset
    //  * @returns {Map<string, import('scarpet-parser/types/Parser').BinaryExpression>}
    //  */
    // getScopeAt(offset, node = this.root, scope = this.globalScope) {
    //     if (
    //         node !== null &&
    //         node.start.offset <= offset &&
    //         node.end.offset > offset
    //     ) {
    //         switch (node.kind) {
    //             case 'Constant':
    //             case 'Variable':
    //             case 'HexLiteral':
    //             case 'NumberLiteral':
    //             case 'StringLiteral':
    //                 return scope;
    //             case 'FunctionExpression':
    //                 if (node.start.offset + node.name.length > offset)
    //                     return scope;
    //             // fallthrough
    //             case 'MapLiteral':
    //             case 'ListLiteral':
    //                 for (const param of node.params) {
    //                     const node = this.getScopeAt(offset, param, scope);
    //                     if (node !== null) return scope;
    //                 }
    //                 break;
    //             case 'BinaryExpression': {
    //                 const left = this.getNodeAt(offset, node.lvalue);
    //                 if (left !== null) return this;
    //                 const right = this.getNodeAt(offset, node.rvalue);
    //                 if (right !== null) return right;
    //                 break;
    //             }
    //             case 'ParenthesisedExpression':
    //             case 'UnaryExpression':
    //                 return this.getScopeAt(offset, node.value);
    //         }
    //     }
    // }

    /**
     * @param {number} offset
     * @returns {import('scarpet-parser').Node?}
     */
    getNodeAt(offset, node = this.root) {
        if (
            node !== null &&
            node.start.offset <= offset &&
            node.end.offset > offset
        ) {
            switch (node.kind) {
                case 'OuterParameter':
                case 'Parameter':
                case 'RestParameter':
                case 'Constant':
                case 'Variable':
                case 'HexLiteral':
                case 'NumberLiteral':
                case 'StringLiteral':
                    return node;
                case 'FunctionDeclaration':
                    // @ts-ignore
                    if (node.start.offset + node.name?.value.length > offset)
                        return node;
                    for (const param of node.params) {
                        const node = this.getNodeAt(offset, param);
                        if (node !== null) return node;
                    }
                    for (const param of node.outerParams) {
                        const node = this.getNodeAt(offset, param);
                        if (node !== null) return node;
                    }
                    if (node.rest !== null) {
                        const rest = this.getNodeAt(offset, node.rest);
                        if (rest !== null) return rest;
                    }
                    return this.getNodeAt(offset, node.body);
                case 'FunctionExpression':
                    if (node.start.offset + node.name.value.length > offset)
                        return node;
                // fallthrough
                case 'MapLiteral':
                case 'ListLiteral':
                    for (const param of node.params) {
                        const node = this.getNodeAt(offset, param);
                        if (node !== null) return node;
                    }
                    break;
                case 'BinaryExpression': {
                    const left = this.getNodeAt(offset, node.lvalue);
                    if (left !== null) return left;
                    const right = this.getNodeAt(offset, node.rvalue);
                    if (right !== null) return right;
                    return node;
                }
                case 'ParenthesisedExpression':
                case 'UnaryExpression':
                    return this.getNodeAt(offset, node.value);
            }
        }
        return null;
    }
}
