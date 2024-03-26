import {InlayHint} from 'vscode-languageserver';
import data from '@federicocarboni/scarpet-docs';

/**
 * @param {import('@federicocarboni/scarpet-parser').Node} ast
 * @param {number} start
 * @param {number} end
 * @param {InlayHint[]} inlayHints
 */
export function getInlayHints(ast, start, end, inlayHints) {
    switch (ast.kind) {
        case 'BinaryExpression':
            getInlayHints(ast.lvalue, start, end, inlayHints);
            if (ast.rvalue !== undefined)
                getInlayHints(ast.rvalue, start, end, inlayHints);
            break;
        case 'ParenthesisedExpression':
        case 'UnaryExpression':
            if (ast.value !== undefined)
                getInlayHints(ast.value, start, end, inlayHints);
            break;
        case 'FunctionDeclaration':
            if (ast.body !== undefined)
                getInlayHints(ast.body, start, end, inlayHints);
            break;
        case 'FunctionExpression': {
            if (ast.params.length !== 0) {
                const builtinFunction = data.functions[ast.name.value];
                if (
                    builtinFunction !== undefined &&
                    builtinFunction.signatures
                ) {
                    const signature = builtinFunction.signatures.find(
                        (signature) =>
                            signature.params.length === ast.params.length,
                    );
                    if (signature !== undefined)
                        for (const [i, sParam] of signature.params.entries()) {
                            const param = ast.params[i];
                            if (
                                param.start.offset >= start &&
                                param.end.offset < end
                            )
                                inlayHints.push({
                                    label: String(sParam.name) + ':',
                                    position: {
                                        line: param.start.line,
                                        character: param.start.character,
                                    },
                                    paddingRight: true,
                                });
                        }
                }
                for (const param of ast.params)
                    getInlayHints(param, start, end, inlayHints);
            }
        }
    }
}
