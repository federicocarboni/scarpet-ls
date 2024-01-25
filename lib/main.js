import {
    TextDocumentSyncKind,
    TextDocuments,
    URI,
    createConnection,
} from 'vscode-languageserver/node.js';
import {TextDocument} from 'vscode-languageserver-textdocument';

import {Diagnostic, getNodeAt, parseScript} from 'scarpet-parser';
import {getHoverContents} from './hover.js';
import {getDefinition} from './definition.js';
import {getCompletion} from './completion.js';

const connection = createConnection();

export const {console} = connection;

// uncaughtExceptionMonitor doesn't prevent crashes, we just inform the
// client before crashing
process.on('uncaughtExceptionMonitor', (error, origin) => {
    let message;
    try {
        message = error && error.stack;
    } catch (_) {
        /* empty */
    }
    if (!message) message = String(error);
    connection.console.error(`Error in ${origin}: ${message}`);
});

const documents = new TextDocuments(TextDocument);
/** @type {Map<URI, import('scarpet-parser').Node>} */
const parsedDocuments = new Map();

/**
 * @typedef {object} InitOptions
 * @property {boolean} [something]
 */

// /** @type {InitOptions} */
// let options = {};

/**
 * @type {import('vscode-languageserver').MarkdownClientCapabilities
 *     | undefined}
 */
let markdown = void 0;
let useItemDefaults = false;

connection.onInitialize((init) => {
    markdown = init.capabilities.general?.markdown;
    useItemDefaults =
        init.capabilities.textDocument?.completion?.completionList?.itemDefaults?.includes(
            'editRange',
        ) ?? false;

    // console.log(JSON.stringify(init.capabilities));
    /** @type {import('vscode-languageserver').ServerCapabilities} */
    const capabilities = {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        diagnosticProvider: {
            interFileDependencies: false,
            workspaceDiagnostics: false,
        },
        hoverProvider: true,
        definitionProvider: true,
        completionProvider: {
            triggerCharacters: [':', '~', "'"],
        },
        // signatureHelpProvider: {
        //     triggerCharacters: ['(', ','],
        // },
    };
    return {capabilities};
});

documents.onDidChangeContent(({document}) => {
    /** @type {Diagnostic[]} */
    const diagnostics = [];
    const root = parseScript(document.getText(), {diagnostics});
    if (root === void 0) return;
    parsedDocuments.set(document.uri, root);
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics: diagnostics.map(({severity, code, message, range}) => ({
            severity,
            code,
            message,
            range,
        })),
    });
});

documents.onDidClose(({document}) => {
    parsedDocuments.delete(document.uri);
});

connection.onHover(({textDocument, position}) => {
    const document = documents.get(textDocument.uri);
    const root = parsedDocuments.get(textDocument.uri);
    if (document === void 0 || root === void 0) return void 0;
    const offset = document.offsetAt(position);
    const node = getNodeAt(root, offset);
    if (node === void 0) return void 0;
    return getHoverContents(!!markdown, root, node);
});

connection.onDefinition(({textDocument, position}) => {
    const document = documents.get(textDocument.uri);
    const root = parsedDocuments.get(textDocument.uri);
    if (document === void 0 || root === void 0) return void 0;
    const offset = document.offsetAt(position);
    const node = getNodeAt(root, offset);
    if (node === void 0) return void 0;
    const definition = getDefinition(textDocument.uri, root, node);
    if (definition === void 0) return void 0;
    return [definition];
});

connection.onCompletion(({textDocument, position}) => {
    const document = documents.get(textDocument.uri);
    const root = parsedDocuments.get(textDocument.uri);
    if (document === void 0 || root === void 0) return void 0;
    const offset = document.offsetAt(position);
    return getCompletion(useItemDefaults, root, offset, position);
});

// connection.onSignatureHelp(({textDocument, position}) => {
//     try {
//         const document = documents.get(textDocument.uri);
//         const root = parsedDocuments.get(textDocument.uri);
//         if (document === void 0 || root === void 0) return void 0;
//         const offset = document.offsetAt(position);
//         const call = getCallAt(root, offset);
//         console.log(JSON.stringify(call));
//         if (call === void 0) return void 0;
//         const [func, index] = call;
//         const definition = findFunctionDefinition(root, func, func.name.value);
//         console.log(JSON.stringify(definition?.signature));
//         if (definition === void 0) return void 0;
//         const signature = resolveExpression(definition.signature);
//         if (signature === void 0 || signature.kind !== 'FunctionExpression')
//             return void 0;
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
//         return void 0;
//     }
// });

documents.listen(connection);
connection.listen();
