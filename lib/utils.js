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

export const hasOwn = Function.prototype.call.bind(
    Object.prototype.hasOwnProperty,
);
