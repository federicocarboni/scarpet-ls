export type Node = StringLiteral | NumberLiteral | BoolLiteral | NullLiteral | FunctionCall | FunctionDefinition | AssignmentExpression | UnaryExpression | BinaryExpression;

export interface NullLiteral {
    type: 'Null';
    start: number;
    end: number;
}

export interface BoolLiteral {
    type: 'Bool';
    value: boolean;
    start: number;
    end: number;
}

export interface NumberLiteral {
    type: 'Number';
    // Maximum range for scarpet numbers is 64 bits which can't be represented
    // with JavaScript number.
    value: number | bigint;
    start: number;
    end: number;
}

export interface StringLiteral {
    type: 'String';
    value: string;
    start: number;
    end: number;
}

export interface MapLiteral {
    type: 'Map';
    value: Map<Node, Node>;
    start: number;
    end: number;
}

export interface ListLiteral {
    type: 'List';
    value: Node[];
    start: number;
    end: number;
}

export interface FunctionCall {
    type: 'FunctionCall';
    ident: string;
    args: Node[];
    docs?: string;
    start: number;
    end: number;
}

export interface FunctionDefinition {
    type: 'FunctionDefinition';
    ident: string;
    params: string[];
    outer: string[];
    body: Node[];
    docs?: string;
    start: number;
    end: number;
}

export interface AssignmentExpression {
    type: 'AssignmentExpression';
    ident: string;
    value: Node;
    operator?: '+' | '-' | '*' | '/';
    start: number;
    end: number;
}

export interface UnaryExpression {
    type: 'UnaryExpression';
    operator: string;
    value: Node;
    start: number;
    end: number;
}

export interface BinaryExpression {
    type: 'BinaryExpression';
    operator: string;
    left: Node;
    right: Node;
    start: number;
    end: number;
}
