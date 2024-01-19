import {
    CompletionItemKind,
    CompletionList,
    Position,
    TextEdit,
} from 'vscode-languageserver/node.js';
import {
    findReachableFunctions,
    findReachableVariables,
    getNodeAt,
    resolveExpression,
} from 'scarpet-parser';

import {console} from './main.js';
import {getRange} from './utils.js';

/**
 * @param {boolean} useItemDefaults
 * @param {import('scarpet-parser').Node} root
 * @param {number} offset
 * @param {Position} position
 * @returns {CompletionList | undefined}
 */
export function getCompletion(useItemDefaults, root, offset, position) {
    const node = getNodeAt(root, offset - 1);
    const functions = findReachableFunctions(root, offset);
    const variables = findReachableVariables(root, offset);
    console.log(JSON.stringify([variables, functions], (_, v) => typeof v === 'bigint' ? String(v) : v))
    if (functions.length === 0 && variables.length === 0) return void 0;
    const range = node ? getRange(node) : {start: position, end: position};
    const itemDefaults = useItemDefaults ? {editRange: range} : void 0;
    return {
        isIncomplete: true,
        itemDefaults,
        items: [
            ...variables.map((variable) => {
                return {
                    label: variable.variable.name,
                    kind: CompletionItemKind.Variable,
                    labelDetails: {
                        description: variable.comment,
                    },
                    textEdit: useItemDefaults
                        ? void 0
                        : TextEdit.replace(range, variable.variable.name),
                    textEditText: useItemDefaults
                        ? variable.variable.name
                        : void 0,
                };
            }),
            ...functions.flatMap((funct) => {
                const signature = resolveExpression(funct.signature);
                if (
                    signature === void 0 ||
                    signature.kind !== 'FunctionExpression'
                )
                    return [];
                return [
                    {
                        label: signature.name.value,
                        kind: CompletionItemKind.Function,
                        textEdit: useItemDefaults
                            ? void 0
                            : TextEdit.replace(range, signature.name.value),
                        textEditText: useItemDefaults
                            ? signature.name.value
                            : void 0,
                    },
                ];
            }),
        ],
    };
}
