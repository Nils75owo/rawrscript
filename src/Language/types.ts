import { exists } from "../utils.js"
import { _baseFunction } from "./classes.js";

export const jsToRawr: { [key: string]: string } = {
	"string": "string",
	"number": "num",
	"array": "array",
	"any": "any",
	"boolean": "bool",
	"object": null,
	"void": null,
	"function": "function"
}

const isOfArrayType = (obj: any, type: string): boolean => {
	if (!Array.isArray(obj)) return false;

	// Gets the last [123]
	const re = /\[\d*\]/g;
	const match = type.matchAll(re);
	let matches: any[] = [];
	while (true) {
		let current = match.next();
		if (current.done) break;
		matches.push(current.value);
	}

	let lastIndex = matches[matches.length - 1].index;
	let length = parseInt(matches[matches.length - 1][0].slice(1, -1)); // Just get the numbers
	if (Number.isNaN(length) || length < 0) length = Infinity;

	if (length < obj.length) return false;

	type = type.slice(0, lastIndex);

	for (let i = 0; i < obj.length; i++) {
		if (!isOfType(obj[i], type)) return false;
	}
	return true;
}

export const isOfType = (obj: any, type: string): boolean => {
	// Arrays
	if (type.indexOf("[") !== -1) return isOfArrayType(obj, type);

	if (type === "any") return true;
	if (type === "void" && !exists(obj)) return true;
	if (jsToRawr[typeof obj] === type) return true;

	switch (type) {
		case "Array":
			if (Array.isArray(obj)) return true;
			break;

		case "function":
			if (obj instanceof _baseFunction) return true;
			break;

		case "object":
			break;

		default:
			break;
	}

	return false;
}
