import { _baseFunction, _baseNamespace } from "/home/mia/rawr/build/Language/classes.js"

export class lib extends _baseNamespace {
  constructor(scope) {
    super(scope);

    this.scope = {
      parentScope: null,
      sayHi: new class extends _baseFunction {
        name = "sayHi";
        returnType = "void";
        parameters = [];

        exec = async(options, constArgsArray, ...parameters) => {
          console.log("hiii");
        }
      }
    }
  }
}
