'use strict';
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const docs = {
    constants: {},
    functions: {},
    minecraftFunctions: {},
    minecraftEvents: {},
};

function parseDocs(dir, docs) {
    for (const entryName of fs.readdirSync(dir)) {
        const entryPath = path.join(dir, entryName);
        if (fs.lstatSync(entryPath).isDirectory()) continue;
        if (!entryName.endsWith('.md')) continue;
        const entry = entryName.slice(0, -3);
        const obj = matter(fs.readFileSync(entryPath, 'utf-8'));
        delete obj.data.title;
        docs[entry] = {
            ...obj.data,
            docs: ('' + obj.content).trim() || void 0,
        };
    }
}

parseDocs(path.join(__dirname, '../scarpet-docs/_constants'), docs.constants);
parseDocs(path.join(__dirname, '../scarpet-docs/_control-flow'), docs.functions);
parseDocs(path.join(__dirname, '../scarpet-docs/_functions'), docs.functions);
parseDocs(path.join(__dirname, '../scarpet-docs/_arithmetic'), docs.functions);
parseDocs(path.join(__dirname, '../scarpet-docs/_minecraft'), docs.functions);
parseDocs(path.join(__dirname, "../scarpet-docs/_events"), docs.minecraftEvents);

const stringify = (value) => JSON.stringify(JSON.stringify(value));

fs.writeFileSync(
    path.join(__dirname, '..', 'lib', 'builtins.js'),
`// @ts-nocheck
/* eslint-disable */
export const CONSTANTS = JSON.parse(${stringify(docs.constants)});
export const FUNCTIONS = JSON.parse(${stringify(docs.functions)});
export const MINECRAFT_EVENTS = JSON.parse(${stringify(docs.minecraftEvents)});
`
);
