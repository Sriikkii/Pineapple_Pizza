const { lexer } = require('./lexer');

const input = "1 + 1\n9 9";

const tokens = [...lexer("file", input)];
console.log(tokens);
