/** @type {import('prettier').Config} */
const config = {
    trailingComma: 'all',
    semi: true,
    singleQuote: true,
    arrowParens: 'always',
    bracketSpacing: false,
    plugins: ['prettier-plugin-jsdoc'],
};

export default config;
