/// <reference types="tree-sitter-cli/dsl" />

//
// Imports
//
import {
	comment,
	block,
	_loop_structures,
	for_body, for_expression,
	while_body, while_expression,
	_controll_structures,
	if_body, else_expression, else_if_expression, if_expression,
} from "./modules/structures";

import {
	internal_setting,
	parameter, parameter_list, const_args, function_definition,
	variable_definition,
	return_statement,
	function_call_parameters, function_call,
	variable_assignment,
	namespace_token, using_namespace_token, namespace_definition, namespace_access,
	using_token, using_statement,
	import_statement, importJS_statement,
} from "./modules/statements";

import {
	_expression,
	binary_expression,
	unary_expression,
	array_expression,
	string_expression,

	//lazy_unary_expression, lazy_binary_expression
	lazy_unary_expression_left, lazy_unary_expression_right, _lazy_unary_expression, lazy_binary_expression
} from "./modules/expressions";


// We do a little parsing
module.exports = grammar({
	name: 'rawrscript',

	externals: $ => [
		$.template_chars,
	],

	// Stuff that can appear everywhere
	extras: $ => [
		' ',
		'\t',
		'\n',
		$.comment,
		//';'
	],


	rules: {
		//
		// The main stuff
		//
		source_file: $ => seq(
			repeat(choice( // all the "params"
				$.internal_setting,
			)),
			repeat($._code), // the code
		),

		_code: $ => choice(
			$.comment,
			seq($.function_call, optional($._semicolon)),
			$._definition,
			$.variable_assignment,
			$.return_statement,
			$.using_statement,

			$._loop_structures,
			$._controll_structures,

			$.import_statement,
			$.importJS_statement,

			seq($._lazy_unary_expression, optional($._semicolon)),
			seq($.lazy_binary_expression, optional($._semicolon)),
		),

		internal_setting: internal_setting,
		comment: comment,


		//
		// Declaration
		//

		_definition: $ => choice(
			$.function_definition,
			seq($.variable_definition, optional($._semicolon)),
			$.namespace_declaration,
		),

		// Functions
		parameter: parameter,
		parameter_list: parameter_list,
		const_args: const_args,
		function_definition: function_definition,


		variable_definition: variable_definition,
		namespace_token: namespace_token,
		namespace_declaration: namespace_definition,

		using_token: using_token,
		using_namespace_token: using_namespace_token,
		using_statement: using_statement,

		import_statement: import_statement,
		importJS_statement: importJS_statement,


		// string test
		template_string: $ => seq(
			'`',
			repeat(choice(
				$.template_chars,
				$.escape_sequence,
				$.template_substitution
			)),
			'`'
		),

		escape_sequence: $ => token.immediate(seq(
			'\\',
			choice(
				/[^xu0-7]/,
				/[0-7]{1,3}/,
				/x[0-9a-fA-F]{2}/,
				/u[0-9a-fA-F]{4}/,
				/u{[0-9a-fA-F]+}/
			)
		)),

		template_substitution: $ => seq(
			'${',
			$._expression,
			'}'
		),


		//
		// Types
		//

		type: $ => choice(
			'bool',
			'num',
			'void',
			'string',
			'any',
			'function',

			$.array_type
		),
		array_type: $ => seq(
			$.type,
			'[',
			optional($.number),
			']'
		),


		// Code blocks
		block: block,

		// Expression
		_expression: _expression,
		binary_expression: binary_expression,
		unary_expression: unary_expression,
		array_expression: array_expression,

		string_expression: string_expression,

		// return
		return_statement: return_statement,

		// Function calls
		function_call_parameters: function_call_parameters,
		function_call: function_call,

		// Variable assignments
		variable_assignment: variable_assignment,

		encapsulated: $ => prec.left(-1, seq(
			"(",
			$._expression,
			")",
		)),

		array_index: $ => seq(
			"[",
			field("index", $._expression),
			"]",
		),

		array_access: $ => seq(
			field("variable", $._expression),
			field("index", $.array_index)
		),


		lazy_unary_expression_left: lazy_unary_expression_left,
		lazy_unary_expression_right: lazy_unary_expression_right,
		//lazy_unary_expression: lazy_unary_expression,
		_lazy_unary_expression: _lazy_unary_expression,
		lazy_binary_expression: lazy_binary_expression,

		//
		// Controll structures
		//
		_loop_structures: _loop_structures,
		for_body: for_body,
		for_expression: for_expression,

		while_body: while_body,
		while_expression: while_expression,

		// If
		_controll_structures: _controll_structures,
		if_body: if_body,
		else_expression: else_expression,
		if_expression: if_expression,
		else_if_expression: else_if_expression,

		namespace_access: namespace_access,
		identifier: () => /([a-z]|[A-Z])+/,
		expression_name: ($: any) => choice(
			/([a-z]|[A-Z]|_|\$)+([a-z]|[A-Z]|_|\$|\d)*/,
			$.namespace_access
		),
		number: () => /\d(\d|\.)*/,
		bool: () => choice("true", "false"),

		_semicolon: $ => ';'
	},

});
