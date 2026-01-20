function isNumeric(c) {
  return c >= "0" && c <= "9";
}

function isAlpha(c) {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}

function lexer(file, str) {
  let line = 1;
  let column = 1;
  let cursor = 0;
  let char = str[cursor];

  function position() {
    return { cursor, line, column };
  }

  function next() {
    cursor++;
    char = str[cursor];
    column++;
  }

  function newline() {
    line++;
    column = 1;
  }

  function stringOfType(delimiter) {
    if (char !== delimiter) return null;

    const start = position();
    next();

    while (char !== delimiter) {
      if (char === undefined) {
        throw new SyntaxError("Unterminated string");
      }
      next();
    }

    next(); // closing quote
    const end = position();

    return {
      type: "String",
      loc: { file, start, end },
    };
  }

  function string() {
    return stringOfType('"') || stringOfType("'");
  }

  function readComment(start) {
    while (char !== undefined && char !== "\n") {
      next();
    }

    const end = position();
    return {
      type: "CommentToken",
      loc: { file, start, end },
    };
  }

  function operator() {
    if (char === "+") {
      const start = position();
      next();
      const end = position();
      return { type: "PlusToken", loc: { file, start, end } };
    }

    if (char === "*") {
      const start = position();
      next();
      const end = position();
      return { type: "MulToken", loc: { file, start, end } };
    }

    if (char === "/") {
      const start = position();
      next();
      if (char === "/") {
        next();
        return readComment(start);
      }
      const end = position();
      return { type: "DivToken", loc: { file, start, end } };
    }

    return null;
  }

  function number() {
    if (!isNumeric(char)) return null;

    const start = position();
    let buffer = "";

    while (isNumeric(char)) {
      buffer += char;
      next();
    }

    const end = position();
    return {
      type: "NumericLiteral",
      value: Number(buffer),
      loc: { file, start, end },
    };
  }

  const KEYWORDS = {
    if: "If",
    else: "Else",
    function: "Function",
  };

  function id() {
    if (!isAlpha(char)) return null;

    const start = position();
    let buffer = "";

    while (isAlpha(char) || isNumeric(char)) {
      buffer += char;
      next();
    }

    const end = position();
    const keywordType = KEYWORDS[buffer];

    if (keywordType) {
      return { type: keywordType, loc: { file, start, end } };
    }

    return {
      type: "Id",
      value: buffer,
      loc: { file, start, end },
    };
  }

  function isWhitespace(c) {
    return c === " " || c === "\t";
  }

  function whitespace() {
    if (!isWhitespace(char)) return null;
    while (isWhitespace(char)) {
      next();
    }
    return { type: "Whitespace" };
  }

  function semicolon() {
    if (char !== ";") return null;
    const start = position();
    next();
    const end = position();
    return { type: "Semicolon", loc: { file, start, end } };
  }

  function colon() {
    if (char !== ":") return null;
    const start = position();
    next();
    const end = position();
    return { type: "Colon", loc: { file, start, end } };
  }

  function parents() {
    const start = position();

    if (char === "(") {
      next();
      return { type: "OpenParent", loc: { file, start, end: position() } };
    }
    if (char === ")") {
      next();
      return { type: "CloseParent", loc: { file, start, end: position() } };
    }
    if (char === "{") {
      next();
      return { type: "OpenCurly", loc: { file, start, end: position() } };
    }
    if (char === "}") {
      next();
      return { type: "CloseCurly", loc: { file, start, end: position() } };
    }

    return null;
  }

  function eol() {
    if (char !== "\n") return null;
    next();
    newline();
    return { type: "Newline" };
  }

  function eof() {
    if (char === undefined) {
      const pos = position();
      return {
        type: "EndOfFileToken",
        loc: { file, start: pos, end: pos },
      };
    }
    return null;
  }

  function nextToken() {
    whitespace();

    const token =
      id() ||
      number() ||
      string() ||
      colon() ||
      semicolon() ||
      parents() ||
      operator() ||
      eol();

    if (token) return token;

    const end = eof();
    if (end) return end;

    throw new SyntaxError(
      `unexpected character "${char}" at ${file}:${line}:${column}`
    );
  }

  return {
    [Symbol.iterator]() {
      return {
        next() {
          const token = nextToken();
          return {
            value: token,
            done: token.type === "EndOfFileToken",
          };
        },
      };
    },
  };
}

module.exports = { lexer };
