'use strict';
const fs = require('fs');
const path = require('path');
// const matter = require('gray-matter');

const stringify = (value) => JSON.stringify(JSON.stringify(value));
async function main() {
    const res = await fetch('https://scarpet.pages.dev/docdata.json');
    const data = await res.json();

    fs.writeFileSync(
        path.join(__dirname, '..', 'lib', 'builtinsData.js'),
        `/* eslint-disable */
/**
 * @typedef {object} BuiltinFunction
 * @property {string} [markdown]
 * @property {string} [plain]
 * @property {string} [deprecated]
 * @property {{ params: { name: string; rest?: boolean; }[]; returns?: string; }[]} signatures
 */
/**
 * @typedef {object} Constant
 * @property {string} [markdown]
 * @property {string} [plain]
 */
/**
 * @typedef {object} BuiltinCallback
 * @property {string} [markdown]
 * @property {string} [plain]
 * @property {string} [deprecated]
 * @property {{ name: string; rest?: boolean; }[]} params
 */
/**
 * @type {{
 *     callbacks: Record<string, BuiltinCallback>;
 *     constants: Record<string, Constant>;
 *     events: string[];
 *     functions: Record<string, BuiltinFunction>;
 * }} */
const data = JSON.parse(${stringify(data)});
export default data;
`,
    );
}
main();

// const docs = {
//     constants: {},
//     functions: {},
//     minecraftFunctions: {},
//     minecraftEvents: {},
// };

// function parseDocs(dir, docs) {
//     for (const entryName of fs.readdirSync(dir)) {
//         const entryPath = path.join(dir, entryName);
//         if (fs.lstatSync(entryPath).isDirectory()) continue;
//         if (!entryName.endsWith('.md')) continue;
//         const entry = entryName.slice(0, -3);
//         const obj = matter(fs.readFileSync(entryPath, 'utf-8'));
//         delete obj.data.title;
//         docs[entry] = {
//             ...obj.data,
//             docs: ('' + obj.content).trim() || undefined,
//         };
//     }
// }

// parseDocs(path.join(__dirname, '../scarpet-docs/_constants'), docs.constants);
// parseDocs(path.join(__dirname, '../scarpet-docs/_control-flow'), docs.functions);
// parseDocs(path.join(__dirname, '../scarpet-docs/_functions'), docs.functions);
// parseDocs(path.join(__dirname, '../scarpet-docs/_arithmetic'), docs.functions);
// parseDocs(path.join(__dirname, '../scarpet-docs/_minecraft'), docs.functions);
// parseDocs(path.join(__dirname, "../scarpet-docs/_events"), docs.minecraftEvents);
