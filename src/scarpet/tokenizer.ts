/**
 * Scarpet has no technical specification, but it does have a "reference"
 * implementation (which is the only valid implementation) in Carpet Mod.
 * The parser implementation aims to be as close as possible to Carpet Mod's own
 * parsing.
 */

export enum TokenType {
    Function,
    Identifier,
    Operator,
    
}

export interface Position {
    row: number,
    col: number,
    pos: number,
}

export interface Token {
    type: TokenType,
    text: string,
    start: Position,
    end: Position,
}

// These should be based on unicode characters we should use the 13.0 unicode
// standard because it's what Java 17 uses. Current JRE version for Minecraft.
// TODO: add SPACE_SEPARATOR, LINE_SEPARATOR, PARAGRAPH_SEPARATOR characters
// excluding \u00A0, \u2007, \u202F
function isWhitespace(char: string): boolean {
    return char === ' ' || char === '\n' || char === '\r' || char === '\t' 
        || char === '\u000B' || char === '\f' || char === '\u001C'
        || char === '\u001D' || char === '\u001E' || char === '\u001F';
}

function isDigit(char: number): boolean {
    return 0x30 <= char && char <= 0x39;
}

function isHexDigit(char: number): boolean {
    return isDigit(char) || 0x41 <= (char + 0x20) && (char + 0x20) <= 0x46
}

export interface ParseException {
    name: 'ParseException',
    message: string,
    start: Position,
    end: Position,
}

export interface TokenizeOptions {
    useUnicodeID?: boolean,
}

export class Tokenizer {
    private col = 0;
    private row = 0;
    private pos = 0;

    constructor(private input: string, private options: TokenizeOptions = {}) {}

    private peek(): string {
        return this.input.charAt(this.pos + 1);
    }

    nextToken(): Token | null {
        if (this.pos >= this.input.length)
            return null;

        let ch = this.input.charAt(this.pos);
        if (isWhitespace(ch) && this.pos < this.input.length) {
            this.pos++;
            if (ch === '\n') {
                this.row++;
                this.col = 0;
            }
            ch = this.input.charAt(this.pos);
        }
        let start: Position = {
            row: this.row,
            col: this.col,
            pos: this.pos,
        };
        let isHex = false;

        if (isDigit(ch.charCodeAt(0))) {
            if (ch === '0' && this.peek() === 'x' || this.peek() === 'X') {
                isHex = true;
            }
            while(isHex && this.peek()) {}
        }

        return null;
    }

    getText(token: Token): string {
        return this.input.slice(token.start.pos, token.end.pos);
    }
}