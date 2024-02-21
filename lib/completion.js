import {
    CompletionItem,
    CompletionItemKind,
    CompletionItemTag,
    CompletionList,
    InsertTextFormat,
    MarkupKind,
    Position,
    Range,
    TextEdit,
} from 'vscode-languageserver/node.js';
import {
    findReachableFunctions,
    findReachableVariables,
    getNodeAt,
    isFunctionReference,
    resolveExpression,
} from 'scarpet-parser';
import data from '@federicocarboni/scarpet-docs';

import {getRange} from './utils.js';
import {
    fromBuiltin,
    fromComment,
    getBuiltinFunctionSyntax,
    getBuiltinSyntax,
    getFunctionSyntax,
} from './documentation.js';

/** @type {CompletionItem[]} */
let defaultCompletionItems = [];
/** @type {CompletionItem[]} */
let defaultFullCompletionItems = [];
// let functionStart = 0;
// let callbackStart = 0;

/** @param {import('vscode-languageserver').ClientCapabilities} clientCapabilities */
export function initializeDefaultItems(clientCapabilities) {
    const completionItem =
        clientCapabilities.textDocument?.completion?.completionItem;
    const useMarkdown =
        completionItem?.documentationFormat?.includes(MarkupKind.Markdown) ??
        Boolean(clientCapabilities.general?.markdown);
    const resolveSupport = completionItem?.resolveSupport?.properties;
    const snippetSupport = completionItem?.snippetSupport;
    const tagSupport = completionItem?.tagSupport;
    const deprecatedSupport = completionItem?.deprecatedSupport;
    const resolveDocumentation = resolveSupport?.includes('documentation');
    const resolveDetail = resolveSupport?.includes('detail');
    let index = 0;
    for (const [label, constant] of Object.entries(data.constants)) {
        const documentation = fromBuiltin(label, constant, useMarkdown);
        /** @type {CompletionItem} */
        const item = {
            label,
            kind: CompletionItemKind.Keyword,
            // Store the index of this item to quickly look up its full version
            // in the completionResolve request.
            data: index,
        };
        /** @type {CompletionItem} */
        const fullItem = {
            ...item,
            documentation,
        };
        if (!resolveDocumentation) {
            item.documentation = documentation;
        }
        defaultCompletionItems.push(item);
        if (resolveSupport) defaultFullCompletionItems.push(fullItem);
        index++;
    }
    // functionStart = index;
    /** @type {CompletionItemTag[]} */
    const deprecatedTags = [CompletionItemTag.Deprecated];
    for (const [label, builtinFunction] of Object.entries(data.functions)) {
        const syntax = getBuiltinFunctionSyntax(label, builtinFunction);
        const documentation = fromBuiltin(
            undefined,
            builtinFunction,
            useMarkdown,
        );
        /** @type {CompletionItem} */
        const item = {
            label,
            kind: CompletionItemKind.Function,
            // Store the index of this item to quickly look up its full version
            // in the completionResolve request.
            data: index,
        };
        if (snippetSupport) {
            // insertTextFormat must be PlainText if not given so to save on
            // space avoid sending it altogether unless it's non default
            item.insertTextFormat = InsertTextFormat.Snippet;
            item.textEditText = `${label}(${builtinFunction.signatures?.[0]?.params?.map((param, i) => `\${${i + 1}:${param.rest ? '...' : ''}${param.name}}`)?.join(', ') ?? ''})`;
        }
        if (builtinFunction.deprecated) {
            if (tagSupport) {
                item.tags = deprecatedTags;
            } else if (deprecatedSupport) {
                item.deprecated = true;
            }
        }
        /** @type {CompletionItem} */
        const fullItem = {
            ...item,
            documentation,
            detail: syntax,
        };
        if (!resolveDocumentation) item.documentation = documentation;
        if (!resolveDetail) item.detail = fullItem.detail;
        defaultCompletionItems.push(item);
        if (resolveSupport) defaultFullCompletionItems.push(fullItem);
        index++;
    }
    // callbackStart = index;
    for (const [label, callback] of Object.entries(data.callbacks)) {
        const syntax = getBuiltinSyntax(label, callback);
        const documentation = fromBuiltin(undefined, callback, useMarkdown);
        /** @type {CompletionItem} */
        const item = {
            label,
            kind: CompletionItemKind.Snippet,
            // Store the index of this item to quickly look up its full version
            // in the completionResolve request.
            data: index,
        };
        if (snippetSupport) {
            item.insertTextFormat = InsertTextFormat.Snippet;
            item.textEditText =
                label === '__config'
                    ? '__config() -> {$0};'
                    : `${label}(${callback.params.map((param, i) => `\${${i + 1}:${param.name}}`).join(', ')}) -> ($0);`;
        } else {
            item.textEditText = `${label}(${callback.params.map(({name}) => name).join(', ')}) -> `;
        }
        if (callback.deprecated) {
            if (tagSupport) {
                item.tags = deprecatedTags;
            } else if (deprecatedSupport) {
                item.deprecated = true;
            }
        }
        /** @type {CompletionItem} */
        const fullItem = {
            ...item,
            documentation,
            detail: syntax,
        };
        if (!resolveDocumentation) item.documentation = documentation;
        if (!resolveDetail) item.detail = fullItem.detail;
        defaultCompletionItems.push(item);
        if (resolveSupport) defaultFullCompletionItems.push(fullItem);
        index++;
    }
}

/** @param {CompletionItem} item */
export function completionResolve(item) {
    if (
        Number.isInteger(item.data) &&
        item.data > 0 &&
        item.data < defaultFullCompletionItems.length
    ) {
        const fullItem = defaultFullCompletionItems[item.data];
        item.documentation = fullItem.documentation;
        item.detail = fullItem.detail;
    }
    return item;
}

/**
 * @param {boolean} snippetSupport
 * @param {boolean} useItemDefaults
 * @param {boolean} useMarkdown
 * @param {CompletionItem[]} items
 * @param {import('scarpet-parser').FunctionDeclaration[]} declarations
 * @param {Range} range
 * @param {boolean} asString
 */
export function pushFunctions(
    snippetSupport,
    useItemDefaults,
    useMarkdown,
    items,
    declarations,
    range,
    asString,
) {
    for (const declaration of declarations) {
        const signature = resolveExpression(declaration.signature);
        if (signature === undefined || signature.kind !== 'FunctionExpression')
            continue;
        const name = signature.name.value;
        // Skip known callbacks
        const callback = data.callbacks[name];
        if (callback !== undefined) continue;
        /** @type {CompletionItem} */
        const item = {
            label: name,
            kind: asString
                ? CompletionItemKind.Constant
                : CompletionItemKind.Function,
            detail: getFunctionSyntax(declaration),
        };
        if (declaration.comment !== undefined) {
            item.documentation = fromComment(
                undefined,
                declaration.comment,
                useMarkdown,
            );
        }
        let textEditText = asString ? `'${name}'` : name;
        if (!asString && snippetSupport) {
            item.insertTextFormat = InsertTextFormat.Snippet;
            textEditText += '(';
            const params = [];
            let rest;
            let tabStop = 1;
            for (const p of signature.params) {
                const param = resolveExpression(p);
                if (param === undefined) continue;
                if (param.kind === 'Variable') {
                    params.push(`\${${tabStop}:${param.name}}`);
                    tabStop++;
                } else if (
                    param.kind === 'UnaryExpression' &&
                    param.value !== undefined &&
                    param.value.kind === 'Variable'
                ) {
                    rest = param.value.name;
                }
            }
            textEditText += params.join(', ');
            if (rest !== undefined)
                textEditText +=
                    (params.length !== 0 ? ', ' : '') +
                    `\${${tabStop}:${rest}}`;
            textEditText += ')';
        }
        if (useItemDefaults) {
            if (textEditText !== name) item.textEditText = textEditText;
        } else {
            item.textEdit = {range, newText: textEditText};
        }
        items.push(item);
    }
}

/**
 * @param {boolean} useItemDefaults
 * @param {boolean} useMarkdown
 * @param {CompletionItem[]} items
 * @param {import('scarpet-parser/types/findDefinition.js').VariableDefinition[]} variables
 * @param {Range} range
 * @returns
 */
export function pushVariables(
    useItemDefaults,
    useMarkdown,
    items,
    variables,
    range,
) {
    for (const variable of variables) {
        const name = variable.variable.name;
        /** @type {CompletionItem} */
        const item = {
            label: name,
            kind: CompletionItemKind.Variable,
            documentation:
                variable.comment !== undefined
                    ? fromComment(undefined, variable.comment, useMarkdown)
                    : undefined,
            textEdit: useItemDefaults
                ? undefined
                : TextEdit.replace(range, name),
            textEditText: useItemDefaults ? name : undefined,
        };
        items.push(item);
    }
}

/**
 * @param {import('vscode-languageserver').ClientCapabilities} clientCapabilities
 * @param {import('scarpet-parser').Node} root
 * @param {number} offset
 * @param {Position} position
 * @param {string} documentText
 * @returns {CompletionList | undefined}
 */
export function getCompletion(
    clientCapabilities,
    root,
    offset,
    position,
    documentText,
) {
    // The rule for Scarpet comments is very simple:
    // double slash // starts a comment and line feed ends it
    const isComment =
        documentText.lastIndexOf('//', offset) >
        documentText.lastIndexOf('\n', offset - 1);
    if (isComment) return undefined;
    const completion = clientCapabilities.textDocument?.completion;
    const completionItem = completion?.completionItem;
    const useItemDefaults = Boolean(completion?.completionList?.itemDefaults);
    const useMarkdown =
        completionItem?.documentationFormat?.includes(MarkupKind.Markdown) ??
        Boolean(clientCapabilities.general?.markdown);
    const snippetSupport = Boolean(completionItem?.snippetSupport);
    const node = getNodeAt(root, offset - 1);
    const functions = findReachableFunctions(root, offset);
    const variables = findReachableVariables(root, offset);
    const range = node ? getRange(node) : {start: position, end: position};
    const itemDefaults = useItemDefaults ? {editRange: range} : undefined;
    const isFunctionString =
        node !== undefined && isFunctionReference(root, node);
    const items = isFunctionString
        ? defaultCompletionItems
              // constants and callbacks would make no sense here
              .filter((item) => item.kind === CompletionItemKind.Function)
              .map((item) => ({
                  ...item,
                  kind: CompletionItemKind.Constant,
                  textEdit: TextEdit.replace(range, `'${item.label}'`),
              }))
        : node?.kind !== 'StringLiteral'
          ? useItemDefaults
              ? [...defaultCompletionItems]
              : // Add the text edit on every item when defaults are not available
                defaultCompletionItems.map((item) => ({
                    ...item,
                    textEdit: TextEdit.replace(
                        range,
                        item.textEditText ?? item.label,
                    ),
                    textEditText: undefined,
                }))
          : [];
    if (isFunctionString || node?.kind !== 'StringLiteral')
        pushFunctions(
            snippetSupport,
            useItemDefaults,
            useMarkdown,
            items,
            functions,
            range,
            isFunctionString,
        );
    if (node?.kind !== 'StringLiteral')
        pushVariables(useItemDefaults, useMarkdown, items, variables, range);
    return {
        isIncomplete: false,
        itemDefaults,
        items,
    };
}
