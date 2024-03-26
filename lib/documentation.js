import {resolveExpression} from '@federicocarboni/scarpet-parser';
import {MarkupContent, MarkupKind} from 'vscode-languageserver';

/**
 * @param {string} comment
 * @param {boolean} markdown
 * @returns
 */
function cleanupComment(comment, markdown) {
    let clean = '';
    let lastChar = '\0';
    let nonspace = true;
    let lf = false;
    // Start from 2 ignoring starting slashes //
    for (let i = 2; i < comment.length; i++) {
        const c = comment.charAt(i);
        // Fix whitespaces for plain text
        if (/^\p{White_Space}$/u.test(c)) {
            if (c === '\n') {
                if (lastChar === '\n' && !lf) {
                    clean += markdown ? '\n\n' : '\n';
                    lf = true;
                }
                i += 2;
            }
            if (nonspace) clean += ' ';
            nonspace = false;
        } else {
            clean += c;
            nonspace = true;
            lf = false;
        }
        lastChar = c;
    }
    return clean.trim();
}

/**
 * Get documentation for a symbol using its comment.
 *
 * @param {string | undefined} syntax
 * @param {string | undefined} comment
 * @param {boolean} markdown
 * @returns {MarkupContent}
 */
export function fromComment(syntax, comment, markdown) {
    let value = syntax
        ? markdown
            ? `\`\`\`scarpet\n${syntax}\n\`\`\`\n\n`
            : `${syntax}\n`
        : '';
    if (comment) value += cleanupComment(comment, markdown);
    return {kind: markdown ? MarkupKind.Markdown : MarkupKind.PlainText, value};
}

/**
 * @param {string | undefined} syntax
 * @param {{markdown?: string; plain?: string; deprecated?: string}} documentation
 * @param {boolean} markdown
 */
export function fromBuiltin(syntax, documentation, markdown) {
    let value = syntax
        ? markdown
            ? `\`\`\`scarpet\n${syntax}\n\`\`\`\n\n`
            : `${syntax}\n`
        : '';
    if (documentation.deprecated) {
        value += documentation.deprecated;
        value += markdown ? '\n\n' : '\n';
    }
    if (markdown && documentation.markdown) {
        value += documentation.markdown;
    } else if (documentation.plain) {
        value += documentation.plain;
    }
    return {kind: markdown ? MarkupKind.Markdown : MarkupKind.PlainText, value};
}

/**
 * @param {import('@federicocarboni/scarpet-parser/types/findDefinition.js').VariableDefinition} definition
 * @param {boolean} markdown
 */
export function fromVariable(definition, markdown) {
    let prefix = '';
    if (definition.kind === 'parameter') {
        prefix += '// Parameter';
        const signature = getDefinitionSignature(definition);
        if (signature) prefix += ' in ' + signature;
        prefix += '\n';
    }
    return fromComment(
        prefix + definition.variable.name,
        definition.comment,
        markdown,
    );
}

/**
 * @param {import('@federicocarboni/scarpet-parser/types/findDefinition.js').VariableDefinition} definition
 * @returns {string | undefined}
 */
function getDefinitionSignature(definition) {
    if (definition.definition.kind === 'FunctionDeclaration') {
        const signature = resolveExpression(definition.definition.signature);
        if (signature?.kind === 'FunctionExpression')
            return signature.name.value;
    }
    return undefined;
}

/**
 * @param {string} name
 * @param {{params: {name: string; rest?: boolean}[]}} signature
 */
export function getBuiltinSyntax(name, signature) {
    let syntax = name + '(';
    syntax += signature.params
        .map((param) => (param.rest ? '...' + param.name : param.name))
        .join(', ');
    syntax += ')';
    return syntax;
}

/**
 * @param {string} name
 * @param {import('@federicocarboni/scarpet-docs').Function} builtinFunction
 */
export function getBuiltinFunctionSyntax(name, builtinFunction) {
    return (
        builtinFunction.signatures
            ?.map((signature) => getBuiltinSyntax(name, signature))
            .join('\n') ?? name + '()'
    );
}

/**
 * Get the signature or syntax hint for the given function declaration.
 *
 * @param {import('@federicocarboni/scarpet-parser').FunctionDeclaration} declaration
 */
export function getFunctionSyntax(declaration) {
    let syntax = '';
    const signature = resolveExpression(declaration.signature);
    if (signature?.kind !== 'FunctionExpression') return undefined;
    syntax += signature.name.value;
    syntax += '(';
    /** @type {string[]} */
    const params = [];
    /** @type {string | undefined} */
    let rest = undefined;
    for (const p of signature.params) {
        const param = resolveExpression(p);
        if (param === undefined) continue;
        if (param.kind === 'Variable') {
            params.push(param.name);
        } else if (
            param.kind === 'UnaryExpression' &&
            param.operator === '...' &&
            param.value !== undefined &&
            param.value.kind === 'Variable'
        ) {
            rest = param.value.name;
        }
        // ignore outer or invalid parameters
    }
    syntax += params.join(', ');
    if (rest !== undefined)
        syntax += (params.length !== 0 ? ', ...' : '...') + rest;
    syntax += ')';
    return syntax;
}
