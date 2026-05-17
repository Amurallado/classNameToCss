import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { Cache } from './cache';
import { debounce, isInsideCSSPropertyValue, getSelectors } from './utils';
import { fileListCache } from './completion';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext, cache: Cache) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cssselectorsupport');
    context.subscriptions.push(diagnosticCollection);

    const debouncedUpdateDiagnostics = debounce((document: vscode.TextDocument) => {
        if (isCss(document.languageId)) {
            updateDiagnostics(document, diagnosticCollection, cache);
        }
    }, 300);

    vscode.workspace.onDidOpenTextDocument(debouncedUpdateDiagnostics);
    vscode.workspace.onDidChangeTextDocument(event => debouncedUpdateDiagnostics(event.document));
    vscode.workspace.onDidCloseTextDocument(document => diagnosticCollection.delete(document.uri));

    // Initial check for already open documents
    vscode.workspace.textDocuments.forEach(debouncedUpdateDiagnostics);
}

function isCss(languageId: string): boolean {
    return ['css', 'less', 'scss', 'sass', 'stylus'].includes(languageId);
}

async function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection, cache: Cache): Promise<void> {
    const config = vscode.workspace.getConfiguration('cssselectorsupport');
    const fileExtensions = config.get<string[]>('include', ['htm', 'html', 'jsx', 'tsx', 'vue', 'php']);
    const sourceFiles = config.get<string[]>('sourceFiles', []);

    let filesToScan: string[] = [];
    if (sourceFiles.length > 0) {
        const sourcePromises = sourceFiles.map(pattern => vscode.workspace.findFiles(pattern, '**/node_modules/**'));
        const foundFiles = (await Promise.all(sourcePromises)).flat();
        filesToScan = foundFiles.map(uri => uri.fsPath);
    } else {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
            const workspacePath = workspaceFolder.uri.fsPath;
            if (fileListCache.has(workspacePath)) {
                filesToScan = fileListCache.get(workspacePath)!;
            } else {
                const filesInWorkspace = await vscode.workspace.findFiles(`**/*.{${fileExtensions.join(',')}}`, '**/node_modules/**');
                filesToScan = filesInWorkspace.map(uri => uri.fsPath);
                fileListCache.set(workspacePath, filesToScan);
            }
        } else if (!document.isUntitled) {
            const currentDir = path.dirname(document.uri.fsPath);
            try {
                const filesInDir = await promisify(fs.readdir)(currentDir);
                const filteredFiles = filesInDir.filter(file => {
                    const ext = file.split('.').pop();
                    // Basic path traversal prevention
                    const isSafe = !file.includes('..') && !file.includes('/') && !file.includes('\\');
                    return isSafe && ext !== undefined && fileExtensions.includes(ext);
                });
                filesToScan = filteredFiles.map(file => path.join(currentDir, file));
            } catch (e) {
                filesToScan = [];
            }
        }
    }

    const selectorPromises = filesToScan.map(filePath => getSelectors(filePath, cache));
    const selectorArrays = await Promise.all(selectorPromises);

    const existingClasses = new Set(selectorArrays.flatMap(s => s.classes).map(c => c.name));
    const existingIds = new Set(selectorArrays.flatMap(s => s.ids).map(i => i.name));

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    lines.forEach((line, i) => {
        const classMatches = Array.from(line.matchAll(/\.([a-zA-Z0-9_-]+)/g));
        const idMatches = Array.from(line.matchAll(/#([a-zA-Z0-9_-]+)/g));

        if (classMatches.length > 0) {
            for (const match of classMatches) {
                const className = match[1];
                const fullMatch = match[0];
                const index = match.index!;

                // Create a position at the start of the match to check context.
                const matchPosition = new vscode.Position(i, index);

                // Skip diagnostics for matches that are inside CSS property values
                if (isInsideCSSPropertyValue(document, matchPosition)) {
                    continue;
                }

                if (!existingClasses.has(className)) {
                    const range = new vscode.Range(i, index, i, index + fullMatch.length);
                    const diagnostic = new vscode.Diagnostic(range, `Class '.${className}' does not exist.`, vscode.DiagnosticSeverity.Error);
                    diagnostics.push(diagnostic);
                }
            }
        }

        if (idMatches.length > 0) {
            for (const match of idMatches) {
                const idName = match[1];
                const fullMatch = match[0];
                const index = match.index!;

                // Create a position at the start of the match to check context.
                const matchPosition = new vscode.Position(i, index);

                // Skip diagnostics when the `#` token is inside a CSS property value
                if (isInsideCSSPropertyValue(document, matchPosition)) {
                    continue;
                }

                if (!existingIds.has(idName)) {
                    const range = new vscode.Range(i, index, i, index + fullMatch.length);
                    const diagnostic = new vscode.Diagnostic(range, `ID '#${idName}' does not exist.`, vscode.DiagnosticSeverity.Error);
                    diagnostics.push(diagnostic);
                }
            }
        }
    });

    diagnosticCollection.set(document.uri, diagnostics);
}
