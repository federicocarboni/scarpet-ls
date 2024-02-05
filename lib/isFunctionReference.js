import {resolveExpression} from 'scarpet-parser';

// Function name -> parameter index of the function
/** @type {Record<string, number>} */
const argCallPositionMap = {
    call: 0,
    task: 0,
    task_thread: 1,
    schedule: 1,
    handle_event: 1,
    entity_load_handler: 1,
    entity_event: 2,
    create_screen: 3,
};

/**
 * @param {import('scarpet-parser').Node} ast
 * @param {import('scarpet-parser').StringLiteral} node
 * @returns {boolean}
 */
export function isFunctionReference(ast, node) {
    switch (ast.kind) {
        case 'BinaryExpression':
            return (
                isFunctionReference(ast.lvalue, node) ||
                (ast.rvalue !== undefined &&
                    isFunctionReference(ast.rvalue, node))
            );
        case 'ParenthesisedExpression':
        case 'UnaryExpression':
            return (
                ast.value !== undefined && isFunctionReference(ast.value, node)
            );
        case 'FunctionExpression': {
            const paramIndex = argCallPositionMap[ast.name.value];
            if (
                paramIndex !== undefined &&
                paramIndex < ast.params.length &&
                resolveExpression(ast.params[paramIndex]) === node
            ) {
                return true;
            }
        }
        // fallthrough
        case 'MapLiteral':
        case 'ListLiteral':
            return ast.params.some((param) => isFunctionReference(param, node));
        case 'FunctionDeclaration': {
            const signature = resolveExpression(ast.signature);
            // Prevent the declaration from being interpreted as a plain
            // function call
            if (signature?.kind === 'FunctionExpression')
                return signature.params.some((param) =>
                    isFunctionReference(param, node),
                );
            if (signature !== undefined && isFunctionReference(signature, node))
                return true;
            return (
                ast.body !== undefined && isFunctionReference(ast.body, node)
            );
        }
    }
    return false;
}
