import {Hover, MarkupKind} from 'vscode-languageserver/node.js';
import {
    findFunctionDefinition,
    findVariableDefinition,
    resolveExpression,
    // isFunctionReference,
} from 'scarpet-parser';

import {getRange} from './utils.js';
import {cleanupComment} from './markdown.js';
import {CONSTANTS, FUNCTIONS} from './builtins.js';

// TODO: cleanup markdown from comments when not supported

/**
 * @param {boolean} markdown
 * @param {object} definition
 * @param {string} definition.docs
 * @param {{params?: {name: string; rest?: boolean}[]; returns?: string}[]} definition.signatures
 * @param {string} name
 * @param {import('scarpet-parser').Node} reference
 * @returns {Hover | undefined}
 */
function getBuiltinFunctionHover(markdown, definition, name, reference) {
    let activeSignature = 0;
    if (reference.kind === 'FunctionExpression') {
        activeSignature = definition.signatures.findIndex(
            (signature) => signature.params?.length === reference.params.length,
        );
        if (activeSignature === -1) activeSignature = 0;
    }
    const signature = definition.signatures?.[activeSignature];
    let contents = '';
    if (signature !== void 0) {
        if (markdown) contents += '```scarpet\n';
        contents +=
            name +
            '(' +
            (signature.params
                ?.map((param) => (param.rest ? '...' + param.name : param.name))
                ?.join(', ') || '') +
            ')\n';
        if (markdown) contents += '```\n\n';
    }
    contents += definition.docs;
    return {
        contents: {
            kind: MarkupKind.Markdown,
            value: contents,
        },
        range: getRange(reference),
    };
}

/**
 * @param {boolean} markdown
 * @param {import('scarpet-parser').FunctionDeclaration} definition
 * @param {import('scarpet-parser').Node} node
 * @returns {Hover | undefined}
 */
function getFunctionHover(markdown, definition, node) {
    let contents = markdown ? '```\n' : '';
    const signature = resolveExpression(definition.signature);
    if (signature === void 0 || signature.kind !== 'FunctionExpression')
        return void 0;
    contents += signature.name.value + '(';
    /** @type {string[]} */
    const params = [];
    /** @type {string | undefined} */
    let rest = void 0;
    for (const p of signature.params) {
        const param = resolveExpression(p);
        if (param === void 0) continue;
        if (param.kind === 'Variable') {
            params.push(param.name);
        } else if (
            param.kind === 'UnaryExpression' &&
            param.operator === '...' &&
            param.value !== void 0 &&
            param.value.kind === 'Variable'
        ) {
            rest = param.value.name;
        }
    }
    contents += params.join(', ');
    if (rest !== void 0)
        contents += (params.length !== 0 ? ', ...' : '...') + rest;
    contents += ') -> ...\n';
    if (markdown) contents += '```\n\n';
    if (definition.comment !== void 0)
        contents += cleanupComment(definition.comment);
    return {
        contents: {
            kind: markdown ? MarkupKind.Markdown : MarkupKind.PlainText,
            value: contents,
        },
        range: getRange(node),
    };
}

/**
 * @param {boolean} markdown
 * @param {import('scarpet-parser/types/findDefinition.js').VariableDefinition} definition
 * @param {import('scarpet-parser').Node} node
 * @returns {Hover}
 */
function getVariableHover(markdown, definition, node) {
    let contents = markdown ? '```\n' : '';
    if (definition.kind === 'parameter') contents += '(parameter) ';
    contents += definition.variable.name;
    if (markdown) contents += '\n```';
    if (definition.comment !== void 0)
        contents += '\n' + cleanupComment(definition.comment);
    return {
        contents: {
            kind: markdown ? MarkupKind.Markdown : MarkupKind.PlainText,
            value: contents,
        },
        range: getRange(node),
    };
}

/**
 * @param {boolean} markdown
 * @param {import('scarpet-parser').HexLiteral
 *     | import('scarpet-parser').NumberLiteral} node
 * @returns {Hover}
 */
function getNumberHover(markdown, node) {
    let contents = markdown ? '```\n' : '';
    const value = node.value.value.toString();
    const point = value.length - Number(node.value.scale);
    contents += value.slice(0, point);
    if (node.value.scale !== 0n) {
        contents += '.';
        contents += value.slice(point);
    }
    if (node.value.scale === 0n) {
        contents += ' (0x' + node.value.value.toString(16).toUpperCase() + ')';
    }
    if (markdown) contents += '\n```';
    return {
        contents: {
            kind: markdown ? MarkupKind.Markdown : MarkupKind.PlainText,
            value: contents,
        },
        range: getRange(node),
    };
}

// const constants = {
//     euler: "The closest number to `e` (Euler's number), the base of the natural logarithms.\n",
//     false: 'A value of type `bool` representing logical `false`.\n',
//     null: 'No value.\n\n`null` represents the absence of a value.\n\n```scarpet\nfoo = null;\n```\n\nAny variable which is not yet defined will default to `null` (if strict mode is\nnot set).\n\n```scarpet\nprint(bar); // bar == null\n```\n\nSimilarly, trying to get a non-existent key from a collection will return `null`.\n',
//     pi: 'The closest number to `pi`, the ratio of the circumference of a circle to its\ndiameter.\n',
//     true: 'A value of type `bool` representing logical `true`.\n',
// };

/**
 * @param {boolean} markdown
 * @param {import('scarpet-parser').Node} root
 * @param {import('scarpet-parser').Node} node
 * @returns {Hover | undefined}
 */
export function getHoverContents(markdown, root, node) {
    switch (node.kind) {
        case 'FunctionExpression': {
            // console.log('' + (node.name.value in FUNCTIONS));
            if (node.name.value in FUNCTIONS)
                return getBuiltinFunctionHover(
                    markdown,
                    // @ts-ignore
                    FUNCTIONS[node.name.value],
                    node.name.value,
                    node,
                );
            const definition = findFunctionDefinition(
                root,
                node,
                node.name.value,
            );
            if (definition === void 0) return void 0;
            return getFunctionHover(markdown, definition, node);
        }
        case 'FunctionDeclaration':
            return getFunctionHover(markdown, node, node);
        case 'Variable': {
            let definition = findVariableDefinition(root, node);
            if (definition === void 0) return void 0;
            return getVariableHover(markdown, definition, node);
        }
        case 'Constant':
            if (node.name in CONSTANTS)
                return {
                    contents: {
                        kind: MarkupKind.Markdown,
                        value:
                            '```\n' +
                            node.name +
                            '\n```\n' +
                            // @ts-ignore
                            constants[node.name].docs,
                    },
                    range: getRange(node),
                };
            break;
        // case 'Parameter':
        // case 'OuterParameter':
        // case 'RestParameter':
        //     return getVariableHover(markdown, node, node);
        case 'HexLiteral':
        case 'NumberLiteral':
            return getNumberHover(markdown, node);
        // case 'StringLiteral':
        //     if (isFunctionReference(root, node)) {
        //         const definition = findFunctionDefinition(
        //             root,
        //             node,
        //             node.value,
        //         );
        //         if (definition === null) return void 0;
        //         return getFunctionHover(markdown, definition, node);
        //     }
        //     break;
    }
    return void 0;
}
