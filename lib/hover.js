import {Hover, MarkupKind} from 'vscode-languageserver/node.js';
import {
    findFunctionDefinition,
    findVariableDefinition,
    isFunctionReference,
} from 'scarpet-parser';

import {getRange} from './utils.js';

// TODO: cleanup markdown from comments when not supported

/**
 * @param {boolean} markdown
 * @param {import('scarpet-parser').FunctionDeclaration} definition
 * @param {import('scarpet-parser').Node} node
 * @returns {Hover}
 */
function getFunctionHover(markdown, definition, node) {
    let contents = markdown ? '```\n' : '';
    if (definition.name !== null) contents += definition.name.value + '(';
    contents += definition.params.map((param) => param.name).join(', ');
    if (definition.rest !== null)
        contents +=
            (definition.params.length !== 0 ? ', ...' : '...') +
            definition.rest.name.name;
    contents += ') -> ...\n';
    if (markdown) contents += '```\n\n';
    if (definition.comment !== null) contents += definition.comment.trimEnd();
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
 * @param {import('scarpet-parser').Node} definition
 * @param {import('scarpet-parser').Node} node
 * @returns {Hover}
 */
function getVariableHover(markdown, definition, node) {
    let contents = markdown ? '```\n' : '';
    if (definition.kind === 'Parameter')
        contents += '(parameter) ' + definition.name;
    else if (definition.kind === 'RestParameter')
        contents += '(parameter) ' + definition.name.name;
    else if (definition.kind === 'OuterParameter')
        contents += '(outer) ' + definition.name.name;
    else if (definition.kind === 'Variable') contents += definition.name;
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
            if (definition === null) return void 0;
            return getFunctionHover(markdown, definition, node);
        }
        case 'FunctionDeclaration':
            return getFunctionHover(markdown, node, node);
        case 'Variable': {
            let definition = findVariableDefinition(root, node);
            if (definition === null) definition = node;
            return getVariableHover(markdown, definition, node);
        }
        case 'Parameter':
        case 'OuterParameter':
        case 'RestParameter':
            return getVariableHover(markdown, node, node);
        case 'HexLiteral':
        case 'NumberLiteral':
            return getNumberHover(markdown, node);
        case 'StringLiteral':
            if (isFunctionReference(root, node)) {
                const definition = findFunctionDefinition(
                    root,
                    node,
                    node.value,
                );
                if (definition === null) return void 0;
                return getFunctionHover(markdown, definition, node);
            }
            break;
    }
    return void 0;
}
