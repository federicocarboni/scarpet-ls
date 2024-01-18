import {Hover, MarkupKind} from 'vscode-languageserver/node.js';
import {
    findFunctionDefinition,
    findVariableDefinition,
    resolveExpression,
    // isFunctionReference,
} from 'scarpet-parser';

import {getRange} from './utils.js';

// TODO: cleanup markdown from comments when not supported

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
        if (param.kind === 'Variable') params.push(param.name);
        else if (
            param.kind === 'UnaryExpression' &&
            param.operator === '...' &&
            param.value !== void 0 &&
            param.value.kind === 'Variable'
        )
            rest = param.value.name;
    }
    contents += params.join(', ');
    if (rest !== void 0)
        contents += (params.length !== 0 ? ', ...' : '...') + rest;
    contents += ') -> ...\n';
    if (markdown) contents += '```\n\n';
    if (definition.comment !== void 0) contents += definition.comment.trimEnd();
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
    if (definition.comment !== void 0) contents += '\n' + definition.comment.trim();
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

/**
 * @param {boolean} markdown
 * @param {import('scarpet-parser').Node} root
 * @param {import('scarpet-parser').Node} node
 * @returns {Hover | undefined}
 */
export function getHoverContents(markdown, root, node) {
    switch (node.kind) {
        case 'FunctionExpression': {
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
