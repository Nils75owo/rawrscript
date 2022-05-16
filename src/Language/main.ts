import type { SyntaxNode } from "tree-sitter";
import type { scope, functionOptions } from "../types";

import { readFileSync, realpathSync } from "fs";
import { perr, exists, exitError, scriptPath } from "../utils.js";
import { Namespace, Func, Var, _baseFunction, _baseNamespace } from "./classes.js";

export const getChildByType = (child: SyntaxNode, type: string) => child.children.filter((child: any) => {
	return child.type === type;
})[0];

export const getFromScope = (obj: string, scope: scope, options: functionOptions, allowDown: boolean = true): any => {
	// Return it if it exists in the current scope
	if (exists(scope[obj])) return scope[obj];
	else {
		// If it doesnt exist on the furthest down scope, it doesnt exist
		if (!exists(scope.parentScope) || !allowDown)
			if (!options.unsave) exitError(`Object: "${obj}" is not declared in this scope!`);

		// Else go one scope down in the tree
		return getFromScope(obj, scope.parentScope, options);
	}
}

//const resolveBinaryExpression = (left: any, operator: string, right: any, scope: scope): any => {
const resolveBinaryExpression = (left: any, operator: string, right: any): any => {
	switch (operator) {
		case "+":
			return left + right;
		case "-":
			return left - right;
		case "/":
			return left / right;
		case "*":
			return left * right;
		case "%":
			return left % right;

		case "==":
			return left === right;
		case "!=":
			return left !== right;
		case "&&":
			return left && right;
		case "||":
			return left || right;

		case ">":
			return left > right;
		case "<":
			return left < right;
		case "<=":
			return left <= right;
		case ">=":
			return left >= right;
	}
}
//const resolveUnaryExpression = (operator: string, right: any, scope: scope): any => {
const resolveUnaryExpression = (operator: string, right: any): any => {
	switch (operator) {
		case "-":
			return -right;
		case "!":
			return !right;
	}
}

const resolveLazyBinaryExpression = (left: any, operator: string, right: any) => {
	switch (operator) {
		case "+=":
			return left.content += right;
		case "-=":
			return left.content -= right;
		case "*=":
			return left.content *= right;
		case "/=":
			return left.content /= right;
		case "%=":
			return left.content %= right;
	}
}

const resolveLazyUnaryExpression = (left: any, right: string, instant: boolean = true) => {
	switch (right) {
		case "++":
			return instant ? ++left.content : left.content++;
		case "--":
			return instant ? --left.content : left.content--;
	}
}

export const resolveNode = async (child: SyntaxNode, scope: scope, options: functionOptions, reference: boolean = false, additionalOpts = { passDown: true }): Promise<any> => {
	switch (child.type) {
		case "bool":
			if (child.text === "true") return true;
			if (child.text === "false") return false;
			return Boolean(child.text)
		case "string_expression":
			let text = "";
			if (child.text[0] === '`') {
				// Template string (`abc ${foo} ${baa}`)
				for (let i = 0; i < child.children[0].children.length; i++) {
					const contentChild = child.children[0].children[i];
					if (contentChild.type === "`") continue;

					text += await resolveNode(contentChild, scope, options);
				}
			}
			else text = child.text.slice(1, -1);
			return text;
		case "number":
			return +child.text;

		case "expression_name":
			if (child.childCount === 0) return reference ?
				(getFromScope(child.text, scope, options, additionalOpts.passDown)) :
				(getFromScope(child.text, scope, options, additionalOpts.passDown)).content;
			if (child.children[0].type === "namespace_access") {
				return reference ?
					(await resolveNode(child.children[0], scope, options)) :
					(await resolveNode(child.children[0], scope, options)).content;
			}

		case "namespace_access": {
			const namespace = await resolveNode(child.children[0], scope, options, true);
			if (!(namespace instanceof _baseNamespace)) exitError(`"${child.text} is not a namespace!"`);
			return await resolveNode(child.children[2], namespace.scope, options, true, { passDown: false });
		}

		case "array_access": {
			const array = await resolveNode(child.children[0], scope, options, false);
			const index = parseInt(await resolveNode(child.children[1], scope, options, true));
			if (!Array.isArray(array)) exitError(`"${child.text} is not an array!"`);
			return await array[index];
		}
		case "array_index": {
			return await resolveNode(child.children[1], scope, options, false);
		}

		case "function_call":
			return await callFunction(child, scope, options);
		case "binary_expression":
			return resolveBinaryExpression(
				await resolveNode(child.children[0], scope, options, false),
				child.children[1].text,
				await resolveNode(child.children[2], scope, options, false),
			);
		case "lazy_binary_expression":
			return resolveLazyBinaryExpression(
				await resolveNode(child.children[0], scope, options, true),
				child.children[1].text,
				await resolveNode(child.children[2], scope, options, false),
			);
		case "unary_expression":
			return resolveUnaryExpression(
				child.children[0].text,
				await resolveNode(child.children[1], scope, options, true),
			)
		case "lazy_unary_expression_left": {
			return resolveLazyUnaryExpression(
				await getFromScope(child.children[0].text, scope, options),
				child.children[1].text,
				false
			);
		}
		case "lazy_unary_expression_right": {
			return resolveLazyUnaryExpression(
				await getFromScope(child.children[1].text, scope, options),
				child.children[0].text,
				true
			);
		}

		case "array_expression": {
			let ret: Promise<any>[] = [];
			for (let i = 0; i < child.childCount; i++) {
				const contentChild = child.children[i];
				if (contentChild.type === "[" || contentChild.type === "]" || contentChild.type === ",") continue;
				ret.push(resolveNode(contentChild, scope, options));
			}

			ret = await Promise.all(ret);
			return ret;
		}

		case "template_chars":
			return child.text;
		case "template_substitution":
			return await resolveNode(child.children[1], scope, options);
		case "escape_sequence":
			return child.text[1];


		case "if_body":
		case "while_body":
			return await resolveNode(child.children[1], scope, options)


		case "encapsulated":
			return await resolveNode(child.children[1], scope, options);
	}

	exitError("Internal error (resolving node failed)!");
}

export const callFunction = async (child: SyntaxNode, scope: scope, options: functionOptions): Promise<any> => {
	// Check type
	//if (child?.type !== "function_call") exitError("Internal Error!");

	// Get the function from scope
	let func = await resolveNode(child.children[0], scope, options, true);

	if (!(func instanceof _baseFunction))
		exitError(`Type: "${func.constructor.name}" is not callable!`);

	let paramsArray: any = [];
	let constArgsArray: any = [];

	//getChildByType(child, "function_call_parameters").children.forEach((child) => {
		//if (child.type !== "(" && child.type !== "," && child.type !== ")") {
			//paramsArray.push(resolveNode(child, scope, options));
		//}
	//})
	//let constArgsChild = getChildByType(child, "const_args");
	child.children[1].children.forEach((child) => {
		if (child.type !== "(" && child.type !== "," && child.type !== ")") {
			paramsArray.push(resolveNode(child, scope, options));
		}
	})
	let constArgsChild = child.children[2];
	if (exists(constArgsChild)) constArgsChild.children.forEach((child) => {
		if (child.type !== "<" && child.type !== "," && child.type !== ">") {
			constArgsArray.push(child.text);
		}
	})

	paramsArray = await Promise.all(paramsArray);
	constArgsArray = await Promise.all(constArgsArray);

	let retValue = await func.exec(Object.assign({}, options), constArgsArray, ...paramsArray);
	return retValue;
}

//
// The main function to run code (handles everything else)
//

export const runCode = async (child: SyntaxNode | SyntaxNode[], scope: scope, options: functionOptions): Promise<any> => {
	let loopOver = null;
	if (Array.isArray(child)) loopOver = child;
	else if (child?.type === "block") loopOver = child.children.slice(1, -1);
	else loopOver = child.children;

	for (let i = 0; i < loopOver.length; i++) {
		const child = loopOver[i];
		switch (child.type) {
			case "variable_definition":
				scope[child.children[1].text] = new Var(
					child.children[0].text,
					child.children[1].text,
					await resolveNode(child.children[3], scope, options)
				);
				break;
			case "function_definition":
				scope[child.children[1].text] = new Func(child, scope);
				break;

			case "namespace_declaration":
				scope[child.children[1].text] = new Namespace(child, scope);
				await scope[child.children[1].text].init(options);
				break;

			case "function_call":
				await callFunction(child, scope, options);
				break;

			case "variable_assignment":
				let theVariable = await resolveNode(child.children[0], scope, options, true);
				theVariable.assign(await resolveNode(child.children[2], scope, options));
				break;

			case "return_statement":
				return await resolveNode(child.children[1], scope, options);

			case "using_statement":
				if (child.children[1].type === "using_namespace_token") {
					const namespace = await resolveNode(child.children[2], scope, options, true);
					for (let key in namespace.scope) if (key !== "parentScope") scope[key] = namespace.scope[key];
				} else {
					const key = await resolveNode(child.children[1], scope, options, true);
					scope[key.name] = key;
				}
				break;

			case "for_expression": {
					let forScope = { parentScope: scope };

					let body = child.children[1].children.slice(1, -1).filter(obj => obj.type !== ";");
					let startingCode = body[0];
					let condition = body[1];
					let endCode = [body[2]];
					let code = child.children[2].children.slice(1, -1);

					await runCode([startingCode], forScope, options);

					while (Boolean(await resolveNode(condition, forScope, options))) {
						await runCode(code, forScope, options);
						await runCode(endCode, forScope, options);
					}
					break;
				}

			case "if_expression": {
				// If it is true run the code
				if (Boolean(await resolveNode(child.children[1], scope, options))) {
					await runCode(child.children[2], scope, options);
				// Else
				} else { // Check if there is an else/else_if block
					if (!exists(child.children[3])) break;

					// Loop through else if blocks untill it hits an else block
					let currentElement = child.children[3];
					while (true) {
						if (currentElement.type === "else_expression") {
							await runCode(currentElement.children[1], scope, options);
							break;
						} else if (currentElement.type === "else_if_expression") {
							if (Boolean(await resolveNode(currentElement.children[2], scope, options))) {
								await runCode(currentElement.children[3], scope, options);
								break;
							} else {
								currentElement = currentElement.children[4];
							}
						}
						else exitError("Internal error!")
					}
				}
				break;
				}

			case "while_expression": {
				let condition = child.children[1];
				let code = child.children[2];

				while (Boolean(await resolveNode(condition, scope, options))) {
					await runCode(code, scope, options);
				}

				break;
				}

			case "lazy_unary_expression_left":
				await resolveNode(child, scope, options, true);
				break;
			case "lazy_unary_expression_right":
				await resolveNode(child, scope, options, true);
				break;
			case "lazy_binary_expression":
				await resolveNode(child, scope, options, true);
				break;
			case ";":
				break;


			case "import_statement": {
				// TODO: create a default path for libraries
				// Get the path of the file
				let path;
				if (child.children[1].text === "file") {
					path = realpathSync(`${await resolveNode(child.children[2], scope, options)}`);
				} else {
					path = `${scriptPath()}/Language/Lib/${await resolveNode(child.children[2], scope, options)}`;
				}
				const as = child.children[4].text;
				// Read the file and parse it
				const file = readFileSync(path, { encoding: "utf8" });
				const code = shared.parser.parse(file);

				// Create a new namespace and execute the code in it
				const isolatedNamespace = new class extends _baseNamespace {
					name = as;
					content: scope = this.scope;
				}({ parentScope: null });
				await runCode(code.rootNode.children, isolatedNamespace.scope, options);
				// Finally add it to the current scope
				scope[as] = isolatedNamespace;
				break;
				}
			case "importJS_statement": {
				// TODO: create a default path for libraries
				let path;
				if (child.children[1].text === "file") {
					path = realpathSync(`${await resolveNode(child.children[2], scope, options)}.mjs`);
				} else {
					path = `${scriptPath()}/Language/Lib/${await resolveNode(child.children[2], scope, options)}.js`;
				}
				const as = child.children[4].text;
				console.log(as);
				const { lib: isolatedNamespace } = await import(path);
				// Finally add it to the current scope
				scope[as] = new isolatedNamespace({ parentScope: null });
				break;
				}

			// Just ignore comments
			case "comment":
				break;

			default: {
				let msg = `Unexpected expression:\n${child.text}\n`;
				if (shared.settings.strict) exitError(msg);
				perr(shared.chalk.yellow(msg));
			}
		}
	}
}
