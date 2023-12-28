'use strict';

/** @type {import('eslint').ESLint.ConfigData} */
const config = {
    extends: ['eslint:recommended', 'plugin:import/recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    globals: {Set: 'readonly', Map: 'readonly'},
    plugins: ['eslint-plugin-import'],
    rules: {
        'import/no-default-export': 'error',
        'import/extensions': ['error', {js: 'always'}],
        // use typescript for this
        'no-unused-vars': 'off',
        'no-undef': 'off',
    },
};

module.exports = config;
