module.exports = {
  semi: true,
  trailingComma: "all",
  singleQuote: true,
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  trailingComma: "es5",
  bracketSpacing: false,
  arrowParens: "always",
  overrides: [
    {
      files: "*.sol",
      options: {
        printWidth: 120,
        tabWidth: 4,
        singleQuote: false,
        bracketSpacing: false,
        explicitTypes: "always"
      }
    }
  ]
}
