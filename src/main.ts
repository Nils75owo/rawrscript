#!node

// All the import shit with ES6 and commonjs compatibility (and dont forget about the native node-modules)

// Import types
import type { ChalkInstance } from "chalk";
import type { Tree } from "tree-sitter";

// Create the require function for native nodejs modules
import { createRequire } from "module";
const cjs_require = createRequire(import.meta.url);

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Chalk as chalk } from "chalk";

// The parser
import Parser from "tree-sitter";
const rawrscript = cjs_require("../tree-sitter-rawrscript");

// Utils
import { pout, perr, exitError, remSetting, rawrc, exists, warnOnce } from "./utils.js";
import { resolveNode, runCode } from "./Language/main.js";

import type { scope } from "./types";
import { std } from "./Language/stdlib.js";

interface settings {
  quiet: boolean;
  strict: boolean;
  ignoreErrors: boolean;
  totalQuiet: boolean;
  verbose: boolean;
  config: string;
  await: boolean;
  warn: boolean;
  unsave: boolean;

  shell: string[];

  [key: string]: any;
}

// Add shared to the global object so you can access it from everywhere
declare global {
  var shared: {
    chalk: ChalkInstance;
    settings: settings;
    args: any;
    anonymousArgs: string[];
    globalScope: scope;

    parser: any;

    runningPromises: Promise<any>[];
  };
}

global.shared = <typeof shared>{};
shared.globalScope = { parentScope: null };
shared.runningPromises = [];

// Parse the arguments passed to rawr
const args: any = yargs(hideBin(process.argv)).argv;
delete args.$0;
shared.args = args;
shared.chalk = new chalk();
shared.anonymousArgs = remSetting("object", ["_"], []);

// The global settings
shared.settings = {
  quiet: remSetting("boolean", ["quiet", "q"], false),
  strict: remSetting("boolean", ["strict", "s"], true),
  ignoreErrors: remSetting("boolean", ["ignoreErrors"], false),
  totalQuiet: remSetting("boolean", ["totalQuiet"], false),
  verbose: remSetting("boolean", ["verbose"], false),
  config: remSetting("string", ["c", "config"], "rawrc"),
  await: remSetting("string", ["a", "await"], true),
  warn: remSetting("boolean", ["W", "warn"], true),
  unsave: remSetting("boolean", ["unsave"], false),

  shell: ["/usr/bin/sh", "-c"],
};

// Warning when there is a setting which isnt used
if (Object.keys(shared.args).length !== 0) {
  if (shared.settings.strict)
    exitError("Unused arguments: " + JSON.stringify(shared.args));
  pout(
    shared.chalk.yellow("Unused arguments: " + JSON.stringify(shared.args)) +
      "\n"
  );
}

// The main function
const main = async () => {
  // Get the code to execute
  const rawrcPath = rawrc.getRawrc();
  let rawrcContent = rawrc.rawrcContent(rawrcPath);

  // Create a new parser for the language and use it
  shared.parser = new Parser();
  shared.parser.setLanguage(rawrscript);
  // Copy the object (there is not fucking setter so this is useless)
  //let code: Tree = JSON.parse(JSON.stringify(parser.parse(rawrcContent)));
  let code: Tree = shared.parser.parse(rawrcContent);

  // Check for syntax errors
  // Get the errors in the file
  let err = code.rootNode.children.filter((child) => {
    return child.type === "ERROR";
  });
  if (err.length > 0) {
    // Split the code into lines
    let lines = rawrcContent.split("\n");

    // Get the lines around the error
    let fromLines = err[0].startPosition.row - 2;
    if (fromLines < 0) fromLines = 0;
    let toLines = err[0].endPosition.row + 3;
    if (toLines > lines.length) toLines = lines.length;

    // Get the lines from the code and mark the error as red
    let errorLines = lines.slice(fromLines, toLines);
    errorLines[2] = shared.chalk.red(errorLines[2]);

    // Add line numbers at the beginning of the line
    for (let i = 0; i < errorLines.length; i++)
      errorLines[i] = `${fromLines + i}: ${errorLines[i]}`;

    // Make it into a string
    let errCode = errorLines.join("\n");

    let errText = shared.chalk.red(
      `${shared.chalk.bold("Unexpected token:")} "${err[0].text}"\n`
    );
    errText += `At:\n\n${errCode}`;

    exitError(errText, true);
  }

  let content = code.rootNode.children;

  // Get the params in the file

  for (let i = 0; true; i++) {
    if (content[i]?.type !== "internal_setting") break;
    shared.settings[content[i].children[1].text] = await resolveNode(
      content[i].children[2],
      shared.globalScope,
      null
    );
    content.splice(i--, 1);
  }

  // Fuck me there is just a getter and no setter so this filter function doesnt worklkasjdfölkjasöldkfj

  /*
	content = content.filter(function f(child): any {
		if (child.constructor.name === "SyntaxNode") return false;
		if (child.children) {
			return (child.children = child.children.filter(f)).length;
		}
	});
	*/

  // reset the global scope for the language
  shared.globalScope = { parentScope: null };
  //shared.globalScope["std"] = new std(shared.globalScope);

  // The main program
  const options = {
    quiet: shared.settings.quiet,
    strict: shared.settings.strict,
    await: shared.settings.await,
    warn: shared.settings.warn,
    unsave: shared.settings.unsave,
  };
  if (shared.settings.unsave) warnOnce("The unsave options is very likely to lead to crashes!", "unsave", options);
  let retValue = await runCode(content, shared.globalScope, options);

  // Wait for running processes to finish
  await Promise.all(shared.runningPromises);

  process.exit(retValue);
};

// Ctrl-c handeling
process.on("SIGINT", () => {
  exitError("Interrupt... Stopping");
});
main();
