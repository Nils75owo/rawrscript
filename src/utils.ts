import { existsSync, readFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from 'url';
import { _baseFunction, _baseNamespace } from "./Language/classes.js"
import type { functionOptions } from "./types"

export const exists = (obj: any) => obj !== undefined && obj !== null;

export const pout = (text: string, options?: functionOptions) => {
	if (options?.quiet) return;
	if (!shared.settings.totalQuiet) process.stdout.write(text);
}
export const perr = (text: string, options?: functionOptions) => {
	if (options?.quiet) return;
	if (!shared.settings.totalQuiet) process.stderr.write(text);
}
export const vlog = (text: string, options?: functionOptions) => {
	if (options?.quiet) return;
	if (shared.settings.verbose) pout(shared.chalk.yellow(shared.chalk.italic(shared.chalk.bold(text + '\n'))));
}

export const exitError = (err: (string | Error) = "Unknown error!", raw: boolean = false) => {
	if (err instanceof Error) {
		err = err.toString();
	}
	if (!raw)
		perr(shared.chalk.red(err) + '\n');
	else
		perr(err + '\n');
	process.exit(1);
}

export const seperator = (sep: string = '=') => {
	return new Array(process.stdout.columns).fill(sep).join('') + '\n';
}

export const escape = (str: string) => {
	str = str.replace(/\\\\/g, '\\');
	str = str.replace(/\\b/, '\b');
	str = str.replace(/\\t/, '\t');
	str = str.replace(/\\n/, '\n');
	str = str.replace(/\\r/, '\r');
	str = str.replace(/\\v/, '\v');
}

// Something simpel to get a setting from the args
export const getSetting = (type: string, setting: string[], defaultValue?: any): any => {
	type = type.toLowerCase();
	// Get the entry in the settings
	let sub: any = null;
	setting.forEach((singleSetting) => {
		if (exists(shared.args[singleSetting])) sub = shared.args[singleSetting];
	});
	// If it was not passed to rawr
	if (sub === null) {
		if (defaultValue === null) {
			// If it was not passed and there is not default to return
			exitError("Internal error!");
		}
		return defaultValue;
	}
	// If the argument is not the correct type (f.e. "doSomething=5" when it should be a boolean)
	if (typeof sub !== type) {
		switch (type) {
			case "string": return String(sub);
			case "number": return parseFloat(sub);
			case "boolean": return Boolean(parseFloat(sub));
			case "object": return JSON.parse(sub);
		}
	}
	return sub;
}

export const remSetting = (type: string, setting: string[], defaultValue?: any): any => {
	let ret = getSetting(type, setting, defaultValue);
	setting.forEach(val => delete shared.args[val]);
	return ret;
}

let warned: { [key: string]: boolean } = {};
export const warnOnce = (warning: string, id: string, options: functionOptions) => {
	if (warned[id]) return;
	warned[id] = true;
	if (options.warn)
		perr(shared.chalk.bold(shared.chalk.yellow(warning + '\n')));
}

export const rawrc = {
	/* Get the path to the rawrc */
	getRawrc: () => {
		let rawrcPath;
		// Find the path
		if (shared.settings.config !== "rawrc")
			rawrcPath = resolve(shared.settings.config);
		else
			rawrcPath = join(process.cwd(), "rawrc");

		// Check if it exists
		if (!existsSync(rawrcPath)) {
			exitError(`Can't find the rawrc file! (${rawrcPath})`);
		}
		return rawrcPath;
	},

	/* Get rawrc content */
	rawrcContent: (filePath: string) => {
		return readFileSync(filePath, { encoding: "utf8" });
	}
}

export const exec = async (cmd: string, options: functionOptions, processName?: string): Promise<number> => {
	// TODO: crossplatform shell
	let error = false;
	let exitCode = 0;

	processName = processName ? processName : cmd.trim().split(' ')[0];

	//const sub = spawn("/usr/bin/sh", ["-c", cmd]);
	const sub = spawn(shared.settings.shell[0], [...shared.settings.shell.slice(1), cmd]);

	// The normal output of commands
	if (!options.quiet) {
		sub.stdout.on("data", (msg: string) => {
			msg = `${shared.chalk.blue("[" + processName + "]: ")}${msg.toString()}`;
			pout(`${shared.chalk.dim(msg)}`);
		});
	}

	// Error output from commands
	sub.stderr.on("data", (err: string) => {
		if (options.strict) exitError(err);
		if (options.quiet) return;
		err = `${shared.chalk.blue("[" + processName + "]: ")}${shared.chalk.red(err.toString())}`;
		perr(err);
	});

	// Wait for the command to finish
	exitCode = await new Promise((res) => {
		sub.on("exit", (code) => {
			res(code);
		});
	});

	if (exitCode !== 0) {
		let err: string = `${shared.chalk.blue("[" + processName + "]: ")}${shared.chalk.red("Exited with exit code: " + exitCode)}\n`;
		if (options.strict) exitError(err, true);
		if (options.quiet) return;
		perr(err);
	}

	return exitCode;
}

export const isNumber = (obj: any): boolean => !Number.isNaN(parseFloat(obj));
export const isWhitespace = (obj: string): boolean => obj === ' ' || obj === '\t';

export const scriptPath = (): string => dirname(fileURLToPath(import.meta.url));
