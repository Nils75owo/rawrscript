import { _baseFunction, _baseNamespace } from "../classes.js";
import { pout, exec, warnOnce, exitError } from "../../utils.js";
import { isOfType } from "../types.js";
import type { scope, parameter, functionOptions } from "../../types";


//
// The std (standart) class
//

export class lib extends _baseNamespace {
	name = "std";
	scope: scope;

	constructor(scope: scope) {
		super(scope);

		// Setup all the functions
		this.scope = {
			parentScope: null,

			//
			// Basic stuff
			//

			// Array length
			len: new class extends _baseFunction {
				// Function data/info
				name = "len";
				returnType = "num";
				parameters = [{ type: "any", name: "content" }];

				// The main function
				exec = async (options: functionOptions, constArgsArray: any[], ...passedParameters: any[]): Promise<any> => {
					if (passedParameters.length !== this.parameters.length) exitError(`Expected ${this.parameters.length} parameters for function: ${this.name}`);
					return passedParameters[0].length;
				}
			}(this.scope),

			//
			// A print function
			//
			print: new class extends _baseFunction {
				// Function data/info
				name = "print";
				returnType = "void";
				parameters: parameter[] = [{ type: "any", name: "content" }];

				// The main function
				exec = async (options: functionOptions, constArgsArray: any[], ...passedParameters: any[]): Promise<any> => {
					constArgsArray.forEach((constArg) => {
						if (constArg[0] === '!') options[constArg.slice(1)] = false;
						else options[constArg] = true;
					});

					if (options.quiet) return null;

					passedParameters.forEach((val) => {
						pout(val + '\n');
					})
					return null;
				}

			}(this.scope),


			//
			// A shell function
			//

			$: new class extends _baseFunction {
				// Function data/info
				name = "$";
				returnType = "any";
				parameters: parameter[] = [{ type: "string", name: "content" }];
				scope: scope;

				// The main function
				exec = async (options: functionOptions, constArgsArray: any[], ...passedParameters: any[]): Promise<number> => {
					constArgsArray.forEach((constArg) => {
						if (constArg[0] === '!') options[constArg.slice(1)] = false;
						else options[constArg] = true;
					})

					if (options.await) return await exec(passedParameters[0], options, passedParameters[1]);
					else shared.runningPromises.push(exec(passedParameters[0], options, passedParameters[1]));
					return null;
				}

			}(this.scope),

			//
			// An inline JavaScript function
			//

			JS: new class extends _baseFunction {
				// Function data/info
				name = "JS";
				returnType = "any";
				parameters: parameter[] = [{ type: "string", name: "content" }];
				scope: scope;

				// The main function
				exec = async (options: functionOptions, constArgsArray: any[], ...passedParameters: any[]): Promise<any> => {
					constArgsArray.forEach((constArg) => {
						if (constArg[0] === '!') options[constArg.slice(1)] = false;
						else options[constArg] = true;
					});

					warnOnce(`"std::JS" is unsave!`, "std::JS warning", options)

					return eval(passedParameters[0])
				}

			}(this.scope),

			//
			// A sleep function
			//

			sleep: new class extends _baseFunction {
				// Function data/info
				name = "sleep";
				returnType = "void";
				parameters: parameter[] = [{ type: "num", name: "ms" }];
				scope: scope;

				// The main function
				exec = async (options: functionOptions, constArgsArray: any[], ...passedParameters: any[]): Promise<void> => {
					constArgsArray.forEach((constArg) => {
						if (constArg[0] === '!') options[constArg.slice(1)] = false;
						else options[constArg] = true;
					});

					if (!isOfType(passedParameters[0], "num"))
						exitError(`"${passedParameters[0]}"\nis not assignable to parameter "${this.parameters[0].name}" which is of type: \n"${this.parameters[0].type}"`);

					if (options.await) return await new Promise<void>(res => setTimeout(res, passedParameters[0]))
					return null;
				}

			}(this.scope)
		};
	}
	content: scope = this.scope;
}
