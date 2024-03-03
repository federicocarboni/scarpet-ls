import {Hover} from 'vscode-languageserver/node.js';
import {
    findFunctionDefinition,
    findVariableDefinition,
    isFunctionReference,
} from 'scarpet-parser';

import {getRange} from './utils.js';
import {
    fromBuiltin,
    fromComment,
    fromVariable,
    getBuiltinFunctionSyntax,
    getBuiltinSyntax,
    getFunctionSyntax,
} from './documentation.js';
import data from '@federicocarboni/scarpet-docs';

/**
 * @param {boolean} useMarkdown
 * @param {import('scarpet-parser').HexLiteral
 *     | import('scarpet-parser').NumberLiteral} node
 * @returns {Hover}
 */
function getNumberHover(useMarkdown, node) {
    let syntax = '';
    const value = node.value.value.toString();
    const point = value.length - Number(node.value.scale);
    syntax += value.slice(0, point);
    if (node.value.scale !== 0n) {
        syntax += '.';
        syntax += value.slice(point);
    }
    if (node.value.scale === 0n) {
        syntax += ' (0x' + node.value.value.toString(16).toUpperCase() + ')';
    }
    return {
        contents: fromComment(syntax, undefined, useMarkdown),
        range: getRange(node),
    };
}

/**
 * @param {import('vscode-languageserver').ClientCapabilities} clientCapabilities
 * @param {import('scarpet-parser').Node} root
 * @param {import('scarpet-parser').Node} node
 * @returns {Hover | undefined}
 */
export function getHoverContents(clientCapabilities, root, node) {
    const useMarkdown = Boolean(clientCapabilities.general?.markdown);
    switch (node.kind) {
        case 'FunctionExpression': {
            const range = getRange(node.name);
            const name = node.name.value;
            // function call
            const callback = data.callbacks[name];
            if (callback !== undefined)
                return {
                    contents: fromBuiltin(
                        getBuiltinSyntax(name, callback),
                        callback,
                        useMarkdown,
                    ),
                    range,
                };
            const builtinFunction = data.functions[name];
            if (builtinFunction !== undefined)
                return {
                    contents: fromBuiltin(
                        getBuiltinFunctionSyntax(name, builtinFunction),
                        builtinFunction,
                        useMarkdown,
                    ),
                    range,
                };
            const definition = findFunctionDefinition(
                root,
                node,
                node.name.value,
            );
            if (definition === undefined) return undefined;
            const syntax = getFunctionSyntax(definition);
            if (syntax === undefined) break;
            return {
                contents: fromComment(syntax, definition.comment, useMarkdown),
                range,
            };
        }
        case 'Variable': {
            const definition = findVariableDefinition(root, node);
            if (definition === undefined) return undefined;
            return {
                contents: fromVariable(definition, useMarkdown),
                range: getRange(node),
            };
        }
        case 'Constant': {
            const constant = data.constants[node.name];
            if (constant === undefined) break;
            return {
                contents: fromBuiltin(node.name, constant, useMarkdown),
                range: getRange(node),
            };
        }
        case 'HexLiteral':
        case 'NumberLiteral':
            return getNumberHover(useMarkdown, node);
        case 'StringLiteral':
            if (isFunctionReference(root, node)) {
                const range = getRange(node);
                const name = node.value;
                const builtinFunction = data.functions[name];
                if (builtinFunction !== undefined)
                    return {
                        contents: fromBuiltin(
                            getBuiltinFunctionSyntax(name, builtinFunction),
                            builtinFunction,
                            useMarkdown,
                        ),
                        range,
                    };
                const definition = findFunctionDefinition(root, node, name);
                if (definition === undefined) return undefined;
                const syntax = getFunctionSyntax(definition);
                if (syntax === undefined) break;
                return {
                    contents: fromComment(
                        syntax,
                        definition.comment,
                        useMarkdown,
                    ),
                    range,
                };
            }
            break;
    }
    return undefined;
}
