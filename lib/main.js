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

export const connection = createConnection();

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

export const documents = new TextDocuments(TextDocument);
/** @type {Map<URI, import('scarpet-parser').Node>} */
export const parsedDocuments = new Map();

export let isMarkdown = true;

/**
 * @typedef {object} InitOptions
 * @property {boolean} [something]
 */

/** @type {InitOptions} */
export let options = {};

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
    };
    return {capabilities};
});

documents.onDidChangeContent(({document}) => {
    /** @type {Diagnostic[]} */
    const diagnostics = [];
    const root = parseScript(document.getText(), {diagnostics});
    if (root === null) return;
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

connection.onHover(({position, textDocument}) => {
    const document = documents.get(textDocument.uri);
    const root = parsedDocuments.get(textDocument.uri);
    if (document === void 0 || root === void 0) return void 0;
    const offset = document.offsetAt(position);
    const node = getNodeAt(root, offset);
    if (node === void 0) return void 0;
    return getHoverContents(!!markdown, root, node);
});

connection.onDefinition(({position, textDocument}) => {
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

documents.listen(connection);
connection.listen();
