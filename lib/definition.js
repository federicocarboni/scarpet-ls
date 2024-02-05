import {
    findFunctionDefinition,
    findVariableDefinition,
    resolveExpression,
} from 'scarpet-parser';
import {getRange} from './utils.js';

/**
 * @param {string} uri
 * @param {import('scarpet-parser').FunctionDeclaration} node
 * @param {import('scarpet-parser').Node} reference
 */
function getFunctionLink(uri, node, reference) {
    const signature = resolveExpression(node.signature) ?? node.signature;
    return {
        originSelectionRange:
            reference.kind === 'FunctionExpression'
                ? getRange(reference.name)
                : getRange(reference),
        targetRange: getRange(node),
        targetSelectionRange:
            signature.kind === 'FunctionExpression'
                ? getRange(signature.name)
                : getRange(signature),
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
        case 'Variable': {
            const definition = findVariableDefinition(root, node);
            if (definition === undefined) return undefined;
            return {
                originSelectionRange: getRange(node),
                targetRange: getRange(definition.variable),
                targetSelectionRange: getRange(definition.variable),
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
            if (definition === undefined) return undefined;
            return getFunctionLink(uri, definition, node);
        }
        // case 'StringLiteral':
        //     if (isFunctionReference(root, node)) {
        //         const definition = findFunctionDefinition(
        //             root,
        //             node,
        //             node.value,
        //         );
        //         if (definition === null) return undefined;
        //         return getFunctionLink(uri, definition, node);
        //     }
        //     break;
    }
    return undefined;
}
