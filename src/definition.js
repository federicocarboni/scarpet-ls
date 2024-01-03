import {findFunctionDefinition, findVariableDefinition} from 'scarpet-parser';
import {getRange, isFunctionString} from './utils.js';

/**
 * @param {string} uri
 * @param {import('scarpet-parser').FunctionDeclaration} node
 * @param {import('scarpet-parser').Node} reference
 */
function getFunctionLink(uri, node, reference) {
    return {
        originSelectionRange: getRange(reference),
        targetRange: getRange(node),
        targetSelectionRange:
            node.name !== null ? getRange(node.name) : getRange(node),
        targetUri: uri,
    };
}

/**
 * @param {string} uri
 * @param {import('scarpet-parser').Node} root
 * @param {import('scarpet-parser').Node} node
 * @returns {import('vscode-languageserver').DefinitionLink | undefined}
 */
export function getDefinition(uri, root, node) {
    switch (node.kind) {
        case 'Parameter':
            return {
                originSelectionRange: getRange(node),
                targetRange: getRange(node),
                targetSelectionRange: getRange(node),
                targetUri: uri,
            };
        case 'RestParameter':
            return {
                originSelectionRange: getRange(node.name),
                targetRange: getRange(node.name),
                targetSelectionRange: getRange(node.name),
                targetUri: uri,
            };
        case 'OuterParameter':
            node = node.name;
        // fallthrough
        case 'Variable': {
            const definition = findVariableDefinition(root, node);
            if (definition === null) return void 0;
            const defRange =
                definition.kind === 'OuterParameter' ||
                definition.kind === 'RestParameter'
                    ? definition.name
                    : definition;
            return {
                originSelectionRange: getRange(node),
                targetRange: getRange(defRange),
                targetSelectionRange: getRange(definition),
                targetUri: uri,
            };
        }
        case 'FunctionDeclaration':
            return getFunctionLink(uri, node, node);
        case 'FunctionExpression': {
            const definition = findFunctionDefinition(
                root,
                node,
                node.name.value,
            );
            if (definition === null) return void 0;
            return getFunctionLink(uri, definition, node);
        }
        case 'StringLiteral':
            if (isFunctionString(root, node)) {
                const definition = findFunctionDefinition(
                    root,
                    node,
                    node.value,
                );
                if (definition === null) return void 0;
                return getFunctionLink(uri, definition, node);
            }
            break;
    }
    return void 0;
}
