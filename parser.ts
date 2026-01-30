import { Token, TokenType, ActorAST, ParseResult, Keyframe } from './types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: string[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParseResult {
    const actors: ActorAST[] = [];
    try {
        while (!this.isAtEnd()) {
            if (this.match(TokenType.KEYWORD) && this.previous().value === 'actor') {
                actors.push(this.actor());
            } else {
                this.advance(); // Skip invalid or unknown
            }
        }
    } catch (e: any) {
        this.errors.push(e.message);
    }

    return { ast: actors, errors: this.errors };
  }

  private actor(): ActorAST {
    // Expect Identifier name
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expect actor name.");
    this.consume(TokenType.LBRACE, "Expect '{' after actor name.");

    const keyframes: Keyframe[] = [];
    let loop = false;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.KEYWORD)) {
            // Handle options like loop
            if (this.previous().value === 'loop') {
                this.consume(TokenType.COLON, "Expect ':' after loop.");
                const val = this.consume(TokenType.VALUE, "Expect boolean value.");
                loop = val.value === 'true';
            }
        } else if (this.match(TokenType.TIME)) {
            // Handle Keyframe: 0s: ...
            const timeStr = this.previous().value;
            this.consume(TokenType.COLON, "Expect ':' after time.");
            
            const props = this.propertiesList();
            keyframes.push({
                timeInMs: this.parseTime(timeStr),
                properties: props
            });
        } else {
            // Error recovery
            this.error(this.peek(), `Unexpected token in actor block: ${this.peek().value}`);
            this.advance();
        }
    }

    this.consume(TokenType.RBRACE, "Expect '}' after actor block.");
    
    // Sort keyframes by time
    keyframes.sort((a, b) => a.timeInMs - b.timeInMs);
    
    // Calculate max duration
    const duration = keyframes.length > 0 ? keyframes[keyframes.length - 1].timeInMs : 0;

    return {
        name: nameToken.value,
        loop,
        keyframes,
        duration
    };
  }

  private propertiesList() {
      const props: {name: string, value: string}[] = [];
      do {
          const propName = this.consume(TokenType.PROPERTY, "Expect property name (x, y, opacity...).");
          const val = this.consume(TokenType.VALUE, `Expect value for property ${propName.value}.`);
          props.push({ name: propName.value, value: val.value });
      } while (this.match(TokenType.COMMA));
      return props;
  }

  private parseTime(timeStr: string): number {
      const val = parseFloat(timeStr);
      if (timeStr.endsWith('ms')) return val;
      if (timeStr.endsWith('s')) return val * 1000;
      return val;
  }

  // Helper methods
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): Error {
    const msg = `Line ${token.line}: ${message}`;
    this.errors.push(msg);
    return new Error(msg);
  }
}