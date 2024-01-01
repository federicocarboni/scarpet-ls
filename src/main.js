import * as lsp from 'vscode-languageserver/node.js';
import {
    TextDocumentSyncKind,
    TextDocuments,
    createConnection,
} from 'vscode-languageserver/node.js';
import {TextDocument} from 'vscode-languageserver-textdocument';

import {ScarpetDocument} from './service.js';
import {writeFileSync} from 'fs';
import {
    findVariableDefinition,
    findFunctionDefinition,
    findAllVariableReferences,
} from 'scarpet-parser';

/**
 *
 * @param {lsp.Connection} connection
 */
function initServer(connection) {
    const documents = new TextDocuments(TextDocument);
    /** @type {Map<string, ScarpetDocument>} */
    const scarpetDocuments = new Map();

    connection.onInitialize((params) => {
        const options = params.initializationOptions;
        connection.console.debug(JSON.stringify(options));
        return {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Full,
                // completionProvider: {
                //     resolveProvider: false,
                //     triggerCharacters: ["'", '('],
                // },
                hoverProvider: true,
                diagnosticProvider: {
                    interFileDependencies: false,
                    workspaceDiagnostics: false,
                },
                definitionProvider: true,
                referencesProvider: true,
            },
        };
    });

    connection.onInitialized((params) => {});

    documents.onDidChangeContent(({document}) => {
        let doc = scarpetDocuments.get(document.uri);
        if (doc !== void 0) {
            doc.onChange(document.getText());
        } else {
            doc = new ScarpetDocument(document.getText(), connection);
            scarpetDocuments.set(document.uri, doc);
        }
        // connection.console.debug(JSON.stringify([...doc.functions.entries()]));
        // writeFileSync(
        //     '/home/federico/Code/scarpet-ls/hell.json',
        //     JSON.stringify(doc.errors),
        // );
        connection.sendDiagnostics({
            uri: document.uri,
            version: document.version,
            diagnostics: doc.diagnostics.map((diagnostic) => ({
                range: diagnostic.range,
                code: diagnostic.code,
                message: diagnostic.message,
                source: diagnostic.source,
                severity: diagnostic.severity,
            })),
        });
    });

    connection.onReferences((params) => {
        const doc = scarpetDocuments.get(params.textDocument.uri);
        const textDoc = documents.get(params.textDocument.uri);
        if (doc === void 0 || textDoc === void 0 || doc.root === null) return null;
        const offset = textDoc.offsetAt(params.position);
        const node = doc.getNodeAt(offset);
        if (
            node?.kind === 'Variable' ||
            node?.kind === 'Parameter' ||
            node?.kind === 'RestParameter' ||
            node?.kind === 'OuterParameter'
        ) {
            return findAllVariableReferences(doc.root, node).map((range) => ({
                uri: params.textDocument.uri,
                range,
            }));
        }
    });

    connection.onDefinition((params) => {
        const doc = scarpetDocuments.get(params.textDocument.uri);
        const textDoc = documents.get(params.textDocument.uri);
        if (doc === void 0 || textDoc === void 0) return null;
        const offset = textDoc.offsetAt(params.position);
        const node = doc.getNodeAt(offset);
        if (node?.kind === 'Variable') {
            const definition = findVariableDefinition(doc.root, node);
            connection.console.debug(
                JSON.stringify(definition, (_, value) =>
                    typeof value === 'bigint' ? String(value) : value,
                ),
            );
            if (definition !== null) {
                return {
                    uri: params.textDocument.uri,
                    range: {start: definition.start, end: definition.end},
                };
            }
        }
        connection.console.debug('onDefinition');
        if (
            (node?.kind === 'FunctionExpression' ||
                node?.kind === 'FunctionDeclaration') &&
            node.name
        ) {
            connection.console.debug(
                JSON.stringify(node, (_, value) =>
                    typeof value === 'bigint' ? String(value) : value,
                ),
            );
            let func;
            try {
                func = findFunctionDefinition(doc.root, node, node.name.value);
            } catch (e) {
                connection.console.debug(String(e));
            }
            connection.console.debug(
                JSON.stringify(func, (_, value) =>
                    typeof value === 'bigint' ? String(value) : value,
                ),
            );
            if (func !== null)
                return {
                    uri: params.textDocument.uri,
                    range: {start: func.name.start, end: func.name.end},
                };
        }
        return null;
    });

    connection.onHover((params) => {
        const doc = scarpetDocuments.get(params.textDocument.uri);
        const textDoc = documents.get(params.textDocument.uri);
        if (doc === void 0 || textDoc === void 0) return null;
        const offset = textDoc.offsetAt(params.position);
        const node = doc.getNodeAt(offset);
        connection.console.debug('onHover');
        connection.console.debug(JSON.stringify(node?.kind === 'Variable'));
        if (node?.kind === 'Variable') {
            connection.console.debug('start');
            const definition = findVariableDefinition(doc.root, node);
            connection.console.debug('end');
            connection.console.debug(
                JSON.stringify(definition, (_, value) =>
                    typeof value === 'bigint' ? String(value) : value,
                ),
            );
            if (definition !== null) {
                return {
                    contents: JSON.stringify(definition, (_, value) =>
                        typeof value === 'bigint' ? String(value) : value,
                    ),
                };
            }
        }
        if (
            (node?.kind === 'FunctionExpression' ||
                node?.kind === 'FunctionDeclaration') &&
            node.name
        ) {
            const ref = findFunctionDefinition(doc.root, node, node.name.value);
            connection.console.debug(
                JSON.stringify(ref, (_, value) =>
                    typeof value === 'bigint' ? String(value) : value,
                ),
            );
            if (ref !== null) {
                const contents = `\`\`\`\n(function) ${
                    ref.name?.value
                }(${ref.params.map((param) => param.name).join(', ')}${
                    ref.rest !== null ? ', ...' + ref.rest.name.name : ''
                }${
                    ref.outerParams.length !== 0
                        ? ', ' +
                          ref.outerParams
                              .map((outer) => 'outer(' + outer.name.name + ')')
                              .join(', ')
                        : ''
                }) -> ...\n\`\`\`\n${ref.comment || ''}`;
                return {
                    contents: {
                        kind: 'markdown',
                        value: contents,
                    },
                    range: {
                        start: ref.start,
                        end: ref.end,
                    },
                };
            }
        }
        return {
            contents: JSON.stringify(node, (_, value) =>
                typeof value === 'bigint' ? String(value) : value,
            ),
        };
    });

    documents.listen(connection);
    connection.listen();
}

initServer(createConnection(lsp.ProposedFeatures.all));
