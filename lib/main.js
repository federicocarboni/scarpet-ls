import {
    CompletionItemKind,
    TextDocumentSyncKind,
    TextDocuments,
    TextEdit,
    URI,
    createConnection,
} from 'vscode-languageserver/node.js';
import {TextDocument} from 'vscode-languageserver-textdocument';

import {
    Diagnostic,
    findReachableFunctions,
    findReachableVariables,
    getNodeAt,
    parseScript,
    resolveExpression,
} from 'scarpet-parser';
import {getHoverContents} from './hover.js';
import {getDefinition} from './definition.js';
import {getRange} from './utils.js';

const connection = createConnection();

const {console} = connection;

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

connection.onInitialize((init) => {
    markdown = init.capabilities.general?.markdown;
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
    const node = getNodeAt(root, offset - 1);
    if (node === void 0) return void 0;
    //
    // const names = findVariableNames(root, node);
    // console.log(JSON.stringify(names))
    const functions = findReachableFunctions(root, offset);
    console.log(
        JSON.stringify(
            functions.map((name) => name.signature),
            (_, value) => (typeof value === 'bigint' ? String(value) : value),
        ),
    );
    const variables = findReachableVariables(root, offset);
    if (functions.length === 0) return void 0;
    return {
        isIncomplete: true,
        items: [
            ...variables.flatMap((variable) => {
                return [
                    {
                        label: variable.variable.name,
                        kind: CompletionItemKind.Variable,
                        textEdit: TextEdit.replace(
                            getRange(node),
                            variable.variable.name,
                        ),
                    },
                ];
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
                        labelDetails: {
                            description: funct.comment,
                        },
                        textEdit: TextEdit.replace(
                            getRange(node),
                            signature.name.value,
                        ),
                    },
                ];
            }),
        ],
    };
});

documents.listen(connection);
connection.listen();
