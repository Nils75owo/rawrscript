import type { SyntaxNode } from "tree-sitter";
import {
	exitError,
	exists,
} from "../utils.js"
import {
	runCode,
} from "./main.js"
import type { scope, functionOptions } from "../types"
import { isOfType } from "./types.js";

export class Var {
	type: string;
	name: string;
	content: any;

	constructor(type: string, name: string, content?: any) {
		this.type = type;
		this.name = name;
		if (exists(content)) this.assign(content);
	}

	assign = (obj: any) => {
		if (!isOfType(obj, this.type))
			exitError(`"${obj}"\nis not assignable to Variable "${this.name}" which is of type: \n"${this.type}"`);
		this.content = obj;
	}
}

export class _baseFunction {
	name: string = "";
	returnType: string = "";
	parameters: { type: string, name: string }[] = [];
	constArgs: string[] = [];
	content: this = this;

	code: SyntaxNode[] = [];

	scope: scope = { parentScope: null };
	exec: (options: functionOptions, constArgsArray: any[], ...passedParameters: any[]) => Promise<any>;

	returnVal = (obj: any) => {
		if (!isOfType(obj, this.returnType))
			exitError(`"${obj}"\nis not assignable to the return type which is: \n"${this.returnType}"`);
		return obj;
	}

	toString = () => {
		let ret = `\nfunc ${this.name}(`;
		this.parameters.forEach((param) => ret += `${param.type} ${param.name}, `)
		ret += `)<${this.constArgs}> ${this.returnType} { ... }`;
		return ret;
	}

	constructor(scope: scope) {
		this.scope.parentScope = scope;
	}
}

export class Func extends _baseFunction {
	name: string = "";
	returnType: string = "";
	parameters: { type: string, name: string }[] = [];
	constArgs: string[] = [];

	code: SyntaxNode[] = [];

	scope: scope;
	constructor(funcitonNode: SyntaxNode, scope: scope) {
		super(scope);

		if (funcitonNode.type !== "function_definition")
			exitError("Internal error!");

		let Structure = ["func", "expression_name", "parameter_list", "const_args", "type", "block"];
		let paramsIndex = 0;

		funcitonNode.children.forEach((structureChild) => {
			switch (structureChild.type) {
				case "func":
					paramsIndex++;
					break;
				case "expression_name":
					this.name = structureChild.text;
					paramsIndex++;
					break;
				case "parameter_list": {
					// Set the function parameters
					structureChild.children.forEach((child) => {
						if (child.type !== "(" && child.type !== ")" && child.type !== ",") {
							this.parameters.push({
								type: child.children[0].text,
								name: child.children[1].text
							});
						}
					})
					paramsIndex++;
					break;
				}
				case "const_args": {
					if (Structure[paramsIndex] === "parameter_list") { // Parameter list not specified
						this.parameters = [];
						paramsIndex++;
					}
					structureChild.children.forEach((child) => {
						if (child.type !== "<" && child.type !== ">")
							this.constArgs.push(child.text);
					});

					paramsIndex++;
					break;
				}

				case "type": {
					if (Structure[paramsIndex] === "parameter_list") { // Parameter list not specified
						this.parameters = [];
						paramsIndex++;
					}
					if (Structure[paramsIndex] === "const_args") { // const args list not specified
						this.constArgs = [];
						paramsIndex++;
					}
					this.returnType = structureChild.text;
					paramsIndex++;
					break;
				}

				case "block": {
					if (Structure[paramsIndex] === "parameter_list") { // Parameter list not specified
						this.parameters = [];
						paramsIndex++;
					}
					if (Structure[paramsIndex] === "const_args") { // const args list not specified
						this.constArgs = [];
						paramsIndex++;
					}
					if (Structure[paramsIndex] === "type") {
						this.returnType = "any";
						paramsIndex++;
					}
					this.code = structureChild.children.slice(1, -1);
					break;
				}
			}
		})

	}

	exec = async (options: functionOptions, constArgsArray: any[], ...passedParameters: any[]): Promise<any> => {
		//options = Object.assign(options);
		if (passedParameters.length !== this.parameters.length) exitError(`Expected ${this.parameters.length} parameters for function: ${this.name}`);
		this.scope = { parentScope: this.scope.parentScope };

		// Push the parameters to the function scope
		passedParameters.forEach((param, i) => {
			this.scope[this.parameters[i].name] = new Var(this.parameters[i].type, `${this.name}::${this.parameters[i].name}`, param);
		});

		this.constArgs.forEach((constArg) => {
			if (constArg[0] === '!') options[constArg.slice(1)] = false;
			else options[constArg] = true;
		});
		constArgsArray.forEach((constArg) => {
			if (constArg[0] === '!') options[constArg.slice(1)] = false;
			else options[constArg] = true;
		})

		return this.returnVal(await runCode(this.code, this.scope, options));
	}
}

export class _baseNamespace {
	name: string = "";
	scope: scope = { parentScope: null };
	content: scope = this.scope;

	constructor(scope: scope) {
		this.scope.parentScope = scope;
	}
}

export class Namespace extends _baseNamespace {
	name: string = "";
	scope: scope;
	code: SyntaxNode[] = [];
	content: scope = this.scope;

	constructor(classNode: SyntaxNode, scope: scope) {
		super(scope);

		this.name = classNode.children[1].text;
		this.code = classNode.children[2].children.slice(1, -1);
	}
	init = async (options: functionOptions) => {
		await runCode(this.code, this.scope, options);
		delete this.code;
	}
}


export class Target extends _baseFunction {
	name: string = "";
	returnType: string = "";
	parameters: { type: string, name: string }[] = [];
	constArgs: string[] = [];
	content: this = this;

	code: SyntaxNode[] = [];

	scope: scope = { parentScope: null };

	exec = async (options: functionOptions, constArgsArray: any[]): Promise<any> => {
		//options = Object.assign(options);
		this.scope = { parentScope: this.scope.parentScope };

		this.constArgs.forEach((constArg) => {
			if (constArg[0] === '!') options[constArg.slice(1)] = false;
			else options[constArg] = true;
		});
		constArgsArray.forEach((constArg) => {
			if (constArg[0] === '!') options[constArg.slice(1)] = false;
			else options[constArg] = true;
		})

		return this.returnVal(await runCode(this.code, this.scope, options));
	}
}
