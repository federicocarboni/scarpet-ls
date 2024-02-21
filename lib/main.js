import {
    InlayHint,
    ProposedFeatures,
    ResponseError,
    TextDocumentSyncKind,
    TextDocuments,
    TextEdit,
    createConnection,
} from 'vscode-languageserver/node.js';
import {TextDocument} from 'vscode-languageserver-textdocument';

import {
    Diagnostic,
    findAllVariableReferences,
    getNodeAt,
    isValidIdentifier,
    parseScript,
    findAllFunctionReferences,
    isFunctionReference,
} from 'scarpet-parser';
import {getHoverContents} from './hover.js';
import {getDefinition} from './definition.js';
import {
    completionResolve,
    getCompletion,
    initializeDefaultItems,
} from './completion.js';
import {getRange, has} from './utils.js';
import {getInlayHints} from './inlayHints.js';
import data from '@federicocarboni/scarpet-docs';

const connection = createConnection(ProposedFeatures.all);

// uncaughtExceptionMonitor doesn't prevent crashes, we just inform the
// client before crashing
process.on('uncaughtExceptionMonitor', (error, origin) => {
    try {
        let message = error && error.stack;
        if (!message) message = String(error);
        connection.console.error(`Error in ${origin}: ${message}`);
    } catch {
        /* empty */
    }
});

const documents = new TextDocuments(TextDocument);
/**
 * Cache the AST so it can be reused
 *
 * @type {Map<string, import('scarpet-parser').Node>}
 */
const documentsAst = new Map();

/**
 * @typedef {object} InitOptions
 * @property {boolean} [something]
 */

/** @type {import('vscode-languageserver').ClientCapabilities} */
let clientCapabilities;

connection.onInitialize((init) => {
    clientCapabilities = init.capabilities;
    initializeDefaultItems(clientCapabilities);
    /** @type {import('vscode-languageserver').ServerCapabilities} */
    const capabilities = {
        // JavaScript (and Scarpet) use UTF-16 strings (it is the default in LSP)
        // positionEncoding: PositionEncodingKind.UTF16,
        textDocumentSync: TextDocumentSyncKind.Incremental,
        hoverProvider: true,
        definitionProvider: true,
        completionProvider: {
            triggerCharacters: [':', '~', "'"],
            resolveProvider: true,
            completionItem: {
                labelDetailsSupport: true,
            },
        },
        renameProvider: {
            prepareProvider: true,
        },
        inlayHintProvider: true,
        documentFormattingProvider: true,
    };
    return {capabilities};
});

connection.onInitialized(() => {
    // connection.client.register()
});

documents.onDidChangeContent(({document}) => {
    /** @type {Diagnostic[]} */
    const diagnostics = [];
    const ast = parseScript(document.getText(), {diagnostics});
    if (ast === undefined) return;
    documentsAst.set(document.uri, ast);
    connection.sendDiagnostics({uri: document.uri, diagnostics});
});

// connection.languages.inlayHint.on(({textDocument}) => {
//     const ast = documentsAst.get(textDocument.uri);
//     return undefined;
// });

documents.onDidClose(({document}) => {
    documentsAst.delete(document.uri);
});

connection.onHover(({textDocument, position}) => {
    const document = documents.get(textDocument.uri);
    const ast = documentsAst.get(textDocument.uri);
    if (document === undefined || ast === undefined) return undefined;
    const offset = document.offsetAt(position);
    const node = getNodeAt(ast, offset);
    if (node === undefined) return undefined;
    return getHoverContents(clientCapabilities, ast, node);
});

connection.onDefinition(({textDocument, position}) => {
    const document = documents.get(textDocument.uri);
    const ast = documentsAst.get(textDocument.uri);
    if (document === undefined || ast === undefined) return undefined;
    const offset = document.offsetAt(position);
    const node = getNodeAt(ast, offset);
    if (node === undefined) return undefined;
    const definition = getDefinition(textDocument.uri, ast, node);
    if (definition === undefined) return undefined;
    return [definition];
});

connection.onCompletion(({textDocument, position}) => {
    const document = documents.get(textDocument.uri);
    const ast = documentsAst.get(textDocument.uri);
    if (document === undefined || ast === undefined) return undefined;
    const offset = document.offsetAt(position);
    return getCompletion(
        clientCapabilities,
        ast,
        offset,
        position,
        document.getText(),
    );
});

connection.onCompletionResolve(completionResolve);

// connection.onSignatureHelp(({textDocument, position}) => {
//     try {
//         const document = documents.get(textDocument.uri);
//         const root = parsedDocuments.get(textDocument.uri);
//         if (document === undefined || root === undefined) return undefined;
//         const offset = document.offsetAt(position);
//         const call = getCallAt(root, offset);
//         console.log(JSON.stringify(call));
//         if (call === undefined) return undefined;
//         const [func, index] = call;
//         const definition = findFunctionDefinition(root, func, func.name.value);
//         console.log(JSON.stringify(definition?.signature));
//         if (definition === undefined) return undefined;
//         const signature = resolveExpression(definition.signature);
//         if (signature === undefined || signature.kind !== 'FunctionExpression')
//             return undefined;
//         const f = {
//             signatures: [
//                 SignatureInformation.create(
//                     func.name.value,
//                     definition.comment,
//                     ...signature.params.flatMap((param) => {
//                         const variable = resolveExpression(param);
//                         switch (variable?.kind) {
//                             case 'Variable':
//                                 return [
//                                     ParameterInformation.create(
//                                         variable.name,
//                                         variable.name,
//                                     ),
//                                 ];
//                             case 'UnaryExpression':
//                                 if (variable.value?.kind === 'Variable')
//                                     return [
//                                         ParameterInformation.create(
//                                             variable.value.name,
//                                             variable.value.name,
//                                         ),
//                                     ];
//                             // fallthrough
//                             default:
//                                 return [];
//                         }
//                     }),
//                 ),
//             ],
//             activeSignature: 0,
//             activeParameter: index,
//         };
//         console.log(JSON.stringify(f));
//         return f;
//     } catch (e) {
//         console.log(String(e));
//         return undefined;
//     }
// });

connection.onPrepareRename(({textDocument, position}) => {
    const document = documents.get(textDocument.uri);
    const ast = documentsAst.get(textDocument.uri);
    if (document === undefined || ast === undefined) return undefined;
    const offset = document.offsetAt(position);
    const node = getNodeAt(ast, offset);
    if (node === undefined) return undefined;
    if (node.kind === 'FunctionExpression') {
        if (has(data.functions, node.name.value))
            return new ResponseError(0, 'Cannot rename built-in functions.');
        return {range: getRange(node.name), placeholder: node.name.value};
    } else if (node.kind === 'Variable') {
        return {range: getRange(node), placeholder: node.name};
    } else {
        return new ResponseError(0, 'Cannot rename this element.');
    }
});

connection.onRenameRequest(({textDocument, position, newName}) => {
    if (!isValidIdentifier(newName))
        return new ResponseError(0, 'Provided name is not a valid identifier');
    const document = documents.get(textDocument.uri);
    const ast = documentsAst.get(textDocument.uri);
    if (document === undefined || ast === undefined) return undefined;
    const offset = document.offsetAt(position);
    const node = getNodeAt(ast, offset);
    if (node === undefined) return undefined;
    if (node.kind === 'Variable') {
        const references = findAllVariableReferences(ast, node);
        return {
            changes: {
                [textDocument.uri]: references.map((node) =>
                    TextEdit.replace(getRange(node), newName),
                ),
            },
        };
    } else if (
        node.kind === 'FunctionExpression' ||
        (node.kind === 'StringLiteral' && isFunctionReference(ast, node))
    ) {
        const references = findAllFunctionReferences(
            ast,
            node,
            node.kind === 'StringLiteral' ? node.value : node.name.value,
        );
        return {
            changes: {
                [textDocument.uri]: references.map((node) =>
                    TextEdit.replace(
                        node.kind === 'FunctionExpression'
                            ? getRange(node.name)
                            : getRange(node),
                        node.kind === 'StringLiteral'
                            ? `'${newName}'`
                            : newName,
                    ),
                ),
            },
        };
    }
    return undefined;
});

connection.languages.inlayHint.on(({textDocument, range}) => {
    const document = documents.get(textDocument.uri);
    const ast = documentsAst.get(textDocument.uri);
    if (document === undefined || ast === undefined) return undefined;
    /** @type {InlayHint[]} */
    const inlayHints = [];
    getInlayHints(
        ast,
        document.offsetAt(range.start),
        document.offsetAt(range.end),
        inlayHints,
    );
    return inlayHints;
});

documents.listen(connection);
connection.listen();
