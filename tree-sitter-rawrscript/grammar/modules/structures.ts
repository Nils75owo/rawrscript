/// <reference types="tree-sitter-cli/dsl" />

export const comment = () => token(choice(
	seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
	seq("//", /.*/)
));

export const block = ($: any) => seq(
	'{',
	repeat($._code),
	'}',
);

//
// Controll structures
//

export const _loop_structures = ($: any) => choice(
	$.for_expression,
	$.while_expression,
);
export const _controll_structures = ($: any) => choice(
	$.if_expression,
);

// For
export const for_expression = ($: any) => seq(
	"for",
	$.for_body,
	field("code", $.block),

	optional($._semicolon),
);


export const for_body = ($: any) => seq(
	"(",
	$.variable_definition,
	";",
	field("condition", $._expression),
	";",
	field("endCode", $._code),
	")"
);

// If
export const if_expression = ($: any) => seq(
	"if",
	field("body", $.if_body),
	field("code", $.block),

	//  else (if) statement
	optional(choice(
		prec(2, $.else_if_expression),
		prec(1, $.else_expression),
	)),

	optional($._semicolon)
);
export const if_body = ($: any) => seq(
	"(",
	field("condition", $._expression),
	")",
);
export const else_expression = ($: any) => seq(
	"else",
	field("code", $.block),
);
export const else_if_expression = ($: any) => seq(
	"else", "if",
	field("body", $.if_body),
	field("code", $.block),

	optional(choice(
		$.else_if_expression,
		$.else_expression
	))
);

// While
export const while_expression = ($: any) => seq(
	"while",
	field("body", $.while_body),
	field("code", $.block),
	optional($._semicolon)
);
export const while_body = ($: any) => seq(
	"(",
	field("condition", $._expression),
	")",
);
