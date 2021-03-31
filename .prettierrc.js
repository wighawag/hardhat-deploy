module.exports = {
  singleQuote: true,
  bracketSpacing: false,
  overrides: [
    {
      files: '*.sol',
      options: {
        printWidth: 128,
        tabWidth: 4,
        singleQuote: false,
        explicitTypes: 'always',
      },
    },
  ],
};
