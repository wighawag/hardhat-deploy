module.exports = {
  singleQuote: true,
  bracketSpacing: false,
  overrides: [
    {
      files: '*.sol',
      options: {
        printWidth: 120,
        tabWidth: 4,
        singleQuote: false,
        explicitTypes: 'always',
      },
    },
  ],
};
