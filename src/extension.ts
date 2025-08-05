// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import completion from "./completion";
import { Cache } from "./cache";
import * as diagnostics from "./diagnostics";

export function activate(context: vscode.ExtensionContext): void {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "css-selector-support" is now active!');
  const cache = new Cache();
  completion(context, cache);
  diagnostics.activate(context, cache);

  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{htm,html,jsx,tsx,vue}"
  );

  watcher.onDidChange((uri) => {
    cache.delete(uri.fsPath);
  });

  watcher.onDidCreate((uri) => {
    cache.delete(uri.fsPath);
  });

  watcher.onDidDelete((uri) => {
    cache.delete(uri.fsPath);
  });

  context.subscriptions.push(watcher);
}

// this method is called when your extension is deactivated
export function deactivate() {}