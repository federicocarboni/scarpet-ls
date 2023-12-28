#!/usr/bin/env node

import * as lsp from 'vscode-languageserver/node';
import { ScarpetServer } from './server';

function main() {
    const conn = lsp.createConnection(
        new lsp.StreamMessageReader(process.stdin),
        new lsp.StreamMessageWriter(process.stdout)
    );
    conn.onInitialize(async (params: lsp.InitializeParams): Promise<lsp.InitializeResult> => {
        const server = await ScarpetServer.initialize(conn, params);
        return { capabilities: server.capabilities() };
    });
    conn.listen();
}

main();
