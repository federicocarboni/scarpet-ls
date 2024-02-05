# Scarpet Language Server

An implementation of the [Language Server Protocol][1] for
[the Scarpet language][2].

Most popular editors support [LSP][1] but make sure to check
[the Language Server editor support table][3].

This project is work in progress and is not very stable at this time.

Most of the heavy lifting is done in [FedericoCarboni/scarpet-parser][4].
Documentation is provided by [FedericoCarboni/scarpet-docs]

## Features

- [x] Documentation on hover for builtin functions and user-defined functions.
- [x] Autocomplete for builtin functions, constants and event callbacks.
- [x] Autocomplete for user-defined functions and variables.
- [x] Go-to definition for user-defined functions and variables.
- [x] Diagnostics for invalid Scarpet code (with limitations).
- [ ] Linting
- [ ] Semantic highlighting
- [ ] Formatter
- [ ] Inlay hints
- [ ] Signature help

### Known Issues

Error reporting is still not very accurate and autocomplete depends on it in
some places, making autocomplete not work sometimes.

Not all built-in functions can be autocompleted or show documentation.

Global variables are handled somewhat inconsistently and will not autocomplete
some of the time.

Most of the language server protocol is not implemented, e.g. formatter,
signature help...

## Installation

If you use VSCode use [FedericoCarboni/vscode-scarpet].

If you want to try it out and you're not afraid of bugs:

```bash
npm install -g FedericoCarboni/scarpet-ls
```

### Running

```bash
scarpet-ls --stdio
```

Different editors configure LSPs differently, here is an example user config for
[Kate](https://kate-editor.org/):

```json
{
    "servers": {
        "scarpet": {
            "command": ["scarpet-ls", "--stdio"],
            "url": "https://github.com/FedericoCarboni/scarpet-ls",
            "highlightingModeRegex": "^Scarpet$"
        }
    }
}
```

If you use Kate you might also need the [syntax highlighting definitions][5].

[1]: https://microsoft.github.io/language-server-protocol/
[2]: https://github.com/gnembon/fabric-carpet/blob/ab79e76b51f084b39654e9833bd6369eefef94cc/docs/scarpet/Full.md
[3]: https://langserver.org/#implementations-client
[4]: https://github.com/FedericoCarboni/scarpet-parser
[5]: https://github.com/FedericoCarboni/kate-scarpet
[FedericoCarboni/scarpet-docs]: https://github.com/FedericoCarboni/scarpet-docs
