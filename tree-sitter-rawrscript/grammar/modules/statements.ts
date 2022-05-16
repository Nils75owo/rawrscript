//
// Function
//

export const internal_setting = ($: any) => seq(
	"@",
	field("key", $.expression_name),
	field("value", choice(
		$.bool,
		$.string_expression,
		$.number,
		$.array_expression,
	)),
	optional($._semicolon),
);

export const parameter = ($: any) => seq(
	field("type", $.type),
	field("name", $.expression_name),
);
export const parameter_list = ($: any) => seq(
	'(',
	field("params", commaSep($.parameter)),
	')'
);
export const const_args = ($: any) => prec.left(1, seq(
	token.immediate('<'),
	field("args", commaSep($._expression)),
	'>'
));

export const function_definition = ($: any) => seq(
	'func',
	field("name", $.expression_name),
	optional(field("parameters", $.parameter_list)),
	optional(field("args", $.const_args)),
	optional(field("returnType", $.type)),
	field("code", $.block),
	optional($._semicolon)
);

//
// Variables
//

export const variable_definition = ($: any) => seq(
	field("type", choice("auto", $.type)),
	field("name", $.expression_name),
	field("assignment", optional(seq(
		"=",
		$._expression
	))),
);

// Return
export const return_statement = ($: any) => prec.left(-1, seq(
	'return',
	$._expression,
	$._semicolon
));

// Function calls

export const function_call_parameters = ($: any) => seq(
	"(",
	commaSep($._expression),
	")",
);

export const function_call = ($: any) => seq(
	field("name", $.expression_name),
	field("parameters", $.function_call_parameters),
	field("constArgs", optional($.const_args)),
);

// Variable assignments
export const variable_assignment = ($: any) => seq(
	$.expression_name,
	optional(repeat1($.array_index)), // the foo[123] for arrays
	"=",
	field("content", $._expression),
	$._semicolon
);


// Namespaces

export const namespace_token = ($: any) => "namespace";
export const namespace_definition = ($: any) => seq(
	field("identifier", $.namespace_token),
	field("name", $.expression_name),
	field("code", $.block),
	optional($._semicolon)
);

export const namespace_access = ($: any) => prec.left(1, seq(
	field("namespace", $.expression_name),
	// The tokens are immediate bc "foo :: baa"|"foo::  baa" is not allowed
	//token.immediate("::"),
	//token.immediate(field("content", $.expression_name)),

	"::",
	field("content", $.expression_name),
));

export const using_token = () => "using";
export const using_namespace_token = () => "namespace";
export const using_statement = ($: any) => seq(
	field("identifier", $.using_token),
	optional($.using_namespace_token),
	$.expression_name,
	$._semicolon,
);

export const import_statement = ($: any) => seq(
	"import",
	choice("file", "lib"),
	$.string_expression,
	"as",
	$.expression_name,
	optional($._semicolon)
);
export const importJS_statement = ($: any) => seq(
	"importJS",
	choice("file", "lib"),
	$.string_expression,
	"as",
	$.expression_name,
	optional($._semicolon)
);

export const commaSep1 = (rule: any) => {
	return sepBy1(',', rule);
}
export const commaSep = (rule: any) => {
	return sepBy(',', rule);
}
export const sepBy = (sep: any, rule: any) => {
	return optional(sepBy1(sep, rule))
}
export const sepBy1 = (sep: any, rule: any) => {
	return seq(rule, repeat(seq(sep, rule)), optional(","));
}

// tiowhtoÖgte
// fdyjtOJ
// 4g jpotvmü0
//
// ewotw
// help
// help
// hrgomr	ṕ#p´814
// 41<F2><F10>8mkr3
// pü3qv5
// rq3v
