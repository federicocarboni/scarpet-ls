# Scarpet Language Server

An implementation of the [Language Server Protocol][1] for
[the Scarpet language][2].

This project is work in progress and is not very stable at this time.

Most of the heavy lifting is done in [FedericoCarboni/scarpet-parser].

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

[1]: https://microsoft.github.io/language-server-protocol/
[2]: https://github.com/gnembon/fabric-carpet/blob/ab79e76b51f084b39654e9833bd6369eefef94cc/docs/scarpet/Full.md
[FedericoCarboni/scarpet-parser]: https://github.com/FedericoCarboni/scarpet-parser
