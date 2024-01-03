import {Range} from 'vscode-languageserver/node.js';

/**
 * @param {Range} node
 * @returns {Range}
 */
export function getRange(node) {
    return {
        start: {line: node.start.line, character: node.start.character},
        end: {line: node.end.line, character: node.end.character},
    };
}

/**
 * @param {import('scarpet-parser').Node} root
 * @param {import('scarpet-parser').StringLiteral} node
 * @returns {boolean} `true` if the string is used in `call` or `schedule` and
 *   should be considered a function reference
 */
export function isFunctionString(root, node) {
    switch (root.kind) {
        case 'FunctionExpression': {
            const params = root.params.filter(
                /** @returns {node is import('scarpet-parser').Node} */ (
                    node,
                ) => node !== null,
            );
            if (root.name.value === 'call' && params[0] === node) return true;
            if (root.name.value === 'schedule' && params[1] === node)
                return true;
        }
        // fallthrough
        case 'MapLiteral':
        case 'ListLiteral':
            for (const param of root.params) {
                if (param === null) continue;
                if (isFunctionString(param, node)) return true;
            }
            break;
        case 'FunctionDeclaration':
            if (root.body !== null) return isFunctionString(root.body, node);
            break;
        case 'BinaryExpression':
            if (isFunctionString(root.lvalue, node)) return true;
            if (root.rvalue === null) break;
            if (isFunctionString(root.rvalue, node)) return true;
            break;
        case 'ParenthesisedExpression':
        case 'UnaryExpression':
            if (root.value !== null) return isFunctionString(root.value, node);
            break;
    }
    return false;
}
