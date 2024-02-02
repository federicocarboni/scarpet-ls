import {
    CompletionItemKind,
    CompletionList,
    InsertTextFormat,
    Position,
    TextEdit,
} from 'vscode-languageserver/node.js';
import {
    findReachableFunctions,
    findReachableVariables,
    getNodeAt,
    resolveExpression,
} from 'scarpet-parser';

import {getRange} from './utils.js';
import data from './builtinsData.js';
import {cleanupComment} from './markdown.js';

const constCompletionItems = Object.entries(data.constants).map(([key, value]) => ({
    label: key,
    kind: CompletionItemKind.Constant,
    documentation: value.markdown,
    textEditText: key,
}));

const funcCompletionItems = Object.entries(data.functions).map(([key, value]) => ({
    label: key,
    kind: CompletionItemKind.Function,
    documentation: value.markdown,
    deprecated: !!value.deprecated,
    textEditText: key,
}));

const callbackCompletionItems = Object.entries(data.callbacks).map(([key, value]) => ({
    label: key,
    kind: CompletionItemKind.Function,
    labelDetails: {

    },
    documentation: value.markdown,
	insertTextFormat: InsertTextFormat.Snippet,
    deprecated: !!value.deprecated,
    textEditText: `${key}(${value.params.map((param, i) => `\${${i}:${param.name}|`).join(', ')}) -> \${${value.params.length}:()}`
}));

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
    // console.log(
    //     JSON.stringify([variables, functions], (_, v) =>
    //         typeof v === 'bigint' ? String(v) : v,
    //     ),
    // );
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
                    documentation:
                        variable.comment !== void 0
                            ? cleanupComment(variable.comment)
                            : void 0,
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
                        documentation:
                            funct.comment !== void 0
                                ? cleanupComment(funct.comment)
                                : void 0,
                        textEdit: useItemDefaults
                            ? void 0
                            : TextEdit.replace(range, signature.name.value),
                        textEditText: useItemDefaults
                            ? signature.name.value
                            : void 0,
                    },
                ];
            }),
            ...constCompletionItems.map((value) => ({
                ...value,
                textEdit: useItemDefaults
                    ? void 0
                    : TextEdit.replace(range, value.label),
                textEditText: useItemDefaults ? value.label : void 0,
            })),
            ...funcCompletionItems.map((value) => ({
                ...value,
                textEdit: useItemDefaults
                    ? void 0
                    : TextEdit.replace(range, value.label),
                textEditText: useItemDefaults ? value.label : void 0,
            })),
            ...callbackCompletionItems.map((value) => ({
                ...value,
                textEdit: useItemDefaults
                    ? void 0
                    : TextEdit.replace(range, value.textEditText),
                textEditText: useItemDefaults ? value.textEditText : void 0,
            })),
        ],
    };
}
