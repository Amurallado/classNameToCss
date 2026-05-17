// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import completion, { fileListCache } from "./completion";
import { Cache } from "./cache";
import * as diagnostics from "./diagnostics";
import { registerDefinitionProvider } from "./navigation";
import { CSSRenameProvider } from "./refactoring";

export function activate(context: vscode.ExtensionContext): void {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
        // This line of code will only be executed once when your extension is activated
        console.log('Congratulations, your extension "css-selector-support" is now active!');
  const cache = new Cache();
  completion(context, cache);
  diagnostics.activate(context, cache);
  registerDefinitionProvider(context, cache);

  const renameProvider = new CSSRenameProvider(cache);
  const selector = [
    { language: 'html', scheme: 'file' },
    { language: 'php', scheme: 'file' },
    { language: 'vue', scheme: 'file' },
    { language: 'javascriptreact', scheme: 'file' },
    { language: 'typescriptreact', scheme: 'file' },
    { language: 'css', scheme: 'file' },
    { language: 'scss', scheme: 'file' },
    { language: 'less', scheme: 'file' }
  ];
  context.subscriptions.push(vscode.languages.registerRenameProvider(selector, renameProvider));

  const watchers = new Map<string, vscode.FileSystemWatcher>();

  function setupWatcher(workspaceFolder: vscode.WorkspaceFolder) {
    const config = vscode.workspace.getConfiguration('cssselectorsupport', workspaceFolder.uri);
    const includeLanguages = config.get<string[]>('include', ['htm', 'html', 'jsx', 'tsx', 'vue', 'php']);
    const pattern = new vscode.RelativePattern(workspaceFolder, `**/*.{${includeLanguages.join(',')}}`);

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidChange((uri) => {
      cache.delete(uri.fsPath);
      fileListCache.delete(workspaceFolder.uri.fsPath);
    });

    watcher.onDidCreate((uri) => {
      cache.delete(uri.fsPath);
      fileListCache.delete(workspaceFolder.uri.fsPath);
    });

    watcher.onDidDelete((uri) => {
      cache.delete(uri.fsPath);
      fileListCache.delete(workspaceFolder.uri.fsPath);
    });

    context.subscriptions.push(watcher);
    watchers.set(workspaceFolder.uri.fsPath, watcher);
  }

  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(setupWatcher);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      for (const folder of event.added) {
        setupWatcher(folder);
      }
      for (const folder of event.removed) {
        const watcher = watchers.get(folder.uri.fsPath);
        if (watcher) {
          watcher.dispose();
          watchers.delete(folder.uri.fsPath);
        }
        fileListCache.delete(folder.uri.fsPath);
      }
    })
  );
}
// this method is called when your extension is deactivated
export function deactivate() {}