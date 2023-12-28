import * as lsp from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class ScarpetServer {
    private documents: lsp.TextDocuments<TextDocument> = new lsp.TextDocuments(TextDocument);

    private constructor(private connection: lsp.Connection) {
        this.documents.listen(this.connection);
        this.documents.onDidChangeContent(({ document }) => {

        });
        this.connection.onHover(this.onHover.bind(this));
    }

    static async initialize(connection: lsp.Connection, params: lsp.InitializeParams): Promise<ScarpetServer> {
        return new ScarpetServer(connection);
    }

    capabilities(): lsp.ServerCapabilities {
        return {
            textDocumentSync: lsp.TextDocumentSyncKind.Full,
            // completionProvider: {
            //     resolveProvider: true,
            // },
            hoverProvider: true,
            // documentHighlightProvider: true,
            // definitionProvider: true,
            // documentSymbolProvider: true,
        };
    }

    register() {

    }

    onCompletion() {}

    onDidChangeContent() {

    }

    onHover(params: lsp.HoverParams): lsp.Hover | null {
        params.position
        const document = this.documents.get(params.textDocument.uri);
        
        return null;
    }
}
