import { commaSep } from "./statements.js"

export const _expression = ($: any) => choice(
	prec(9, $.function_call),

	prec(8, $.array_expression),
	prec(7, $.array_access),

	prec(6, $.bool),

	prec(5, $.binary_expression),
	prec(5, $.unary_expression),

	prec(4, $.number),
	prec(4, $.string_expression),

	prec(3, $.expression_name),

	prec(2, $.encapsulated),

	//prec(1, $.lazy_unary_expression),
	prec(1, $._lazy_unary_expression),
	prec(1, $.lazy_binary_expression),
);


export const binary_expression = ($: any) => prec.left(-1, choice(
	prec.left(1, seq(field("left", $._expression), '<', field("right", $._expression))),
	prec.left(1, seq(field("left", $._expression), '>', field("right", $._expression))),
	prec.left(1, seq(field("left", $._expression), '<=', field("right", $._expression))),
	prec.left(1, seq(field("left", $._expression), '>=', field("right", $._expression))),

	prec.left(2, seq(field("left", $._expression), '+', field("right", $._expression))),
	prec.left(2, seq(field("left", $._expression), '-', field("right", $._expression))),

	prec.left(3, seq(field("left", $._expression), '*', field("right", $._expression))),
	prec.left(3, seq(field("left", $._expression), '/', field("right", $._expression))),
	prec.left(3, seq(field("left", $._expression), '%', field("right", $._expression))),


	prec.left(4, seq(field("left", $._expression), '&&', field("right", $._expression))),
	prec.left(4, seq(field("left", $._expression), '||', field("right", $._expression))),

	prec.left(5, seq(field("left", $._expression), '==', field("right", $._expression))),
	prec.left(5, seq(field("left", $._expression), '!=', field("right", $._expression))),
));

export const lazy_binary_expression = ($: any) => choice(
	seq(field("left", $.expression_name), '+=', field("right", $._expression), $._semicolon),
	seq(field("left", $.expression_name), '-=', field("right", $._expression), $._semicolon),

	seq(field("left", $.expression_name), '*=', field("right", $._expression), $._semicolon),
	seq(field("left", $.expression_name), '/=', field("right", $._expression), $._semicolon),
	seq(field("left", $.expression_name), '%=', field("right", $._expression), $._semicolon),
);

//export const lazy_unary_expression = ($: any) => prec.left(choice(
	//seq(
		//$.expression_name,
		//field("argument", choice('++', '--')),
	//),
	//seq(
		//field("argument", choice('++', '--')),
		//$.expression_name, 
	//),
//));
export const _lazy_unary_expression = ($: any) => prec.left(choice(
	$.lazy_unary_expression_left,
	$.lazy_unary_expression_right,
));
export const lazy_unary_expression_left = ($: any) => prec.left(
	seq(
		$.expression_name,
		field("argument", choice(
			'++',
			'--'
		))
	)
);
export const lazy_unary_expression_right = ($: any) => prec.left(
	seq(
		field("argument", choice(
			'++',
			'--'
		)),
		$.expression_name
	)
);


export const unary_expression = ($: any) => prec(6, choice(
	seq('-', $._expression),
	seq('+', $._expression),

	seq('!', $._expression),
));

export const array_expression = ($: any) => seq(
	"[",
	commaSep($._expression),
	"]",
);

export const string_expression = ($: any) => choice(
	seq('"', field("content", /([^"\n]|\\(.|\n))*/), '"'),
	seq("'", field("content", /([^'\n]|\\(.|\n))*/), "'"),

	$.template_string,
);
