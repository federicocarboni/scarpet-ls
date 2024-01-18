# Scarpet Language Server

An implementation of the [Language Server Protocol][1] for
[the Scarpet language][2].

Most popular editors support [LSP][1] but make sure to check
[the Language Server editor support table][3].

This project is work in progress and is not very stable at this time.

Most of the heavy lifting is done in [FedericoCarboni/scarpet-parser][4].

## Features

- Documentation on hover for variables and functions.
- Go-to-definition for variables and functions.
- Autocomplete for local variables and functions.

## Limitations

Error reporting is still not very accurate and autocomplete depends on it in
some places, making autocomplete not work sometimes.

Autocomplete and documentation on hover do not support built-in functions (yet).

Most of the language server protocol is not implemented, e.g. formatter,
signature help...

## Installation

If you want to try it out and you're not afraid of bugs:

```
npm install -g FedericoCarboni/scarpet-ls
```

### Running

```
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
