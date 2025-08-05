import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Cache } from './cache';

const readFile = promisify(fs.readFile);
const classRegex = /class=(?:"([^"]*)"|'([^']*)')/g;
const classNameRegex = /className=(?:"([^"]*)"|'([^']*)')/g;
const idRegex = /id=(?:"([^"]*)"|'([^']*)')/g;

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext, cache: Cache) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cssselectorsupport');
    context.subscriptions.push(diagnosticCollection);

    const updateDiagnosticsWithCache = (document: vscode.TextDocument) => {
        if (isCss(document.languageId)) {
            updateDiagnostics(document, diagnosticCollection, cache);
        }
    };

    vscode.workspace.onDidOpenTextDocument(updateDiagnosticsWithCache);
    vscode.workspace.onDidChangeTextDocument(event => updateDiagnosticsWithCache(event.document));
    vscode.workspace.onDidCloseTextDocument(document => diagnosticCollection.delete(document.uri));

    // Initial check for already open documents
    vscode.workspace.textDocuments.forEach(updateDiagnosticsWithCache);
}

function isCss(languageId: string): boolean {
    return ['css', 'less', 'scss', 'sass', 'stylus'].includes(languageId);
}

async function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection, cache: Cache): Promise<void> {
    const config = vscode.workspace.getConfiguration('cssselectorsupport');
    const fileExtensions = config.get<string[]>('include', ['htm', 'html', 'jsx', 'tsx', 'vue']);
    const sourceFiles = config.get<string[]>('sourceFiles', []);

    let filesToScan: string[] = [];
    if (sourceFiles.length > 0) {
        const sourcePromises = sourceFiles.map(pattern => vscode.workspace.findFiles(pattern, '**/node_modules/**'));
        const foundFiles = (await Promise.all(sourcePromises)).flat();
        filesToScan = foundFiles.map(uri => uri.fsPath);
    } else {
        const currentDir = path.dirname(document.uri.fsPath);
        try {
            const filesInDir = await promisify(fs.readdir)(currentDir);
            const filteredFiles = filesInDir.filter(file => {
                const ext = file.split('.').pop();
                return ext !== undefined && fileExtensions.includes(ext);
            });
            filesToScan = filteredFiles.map(file => path.join(currentDir, file));
        } catch (e) {
            filesToScan = [];
        }
    }

    const selectorPromises = filesToScan.map(filePath => getSelectors(filePath, cache));
    const selectorArrays = await Promise.all(selectorPromises);

    const existingClasses = new Set(selectorArrays.flatMap(s => s.classes).flatMap(c => c.split(' ')).filter(Boolean));
    const existingIds = new Set(selectorArrays.flatMap(s => s.ids).filter(Boolean));

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const classMatches = Array.from(line.matchAll(/\.([a-zA-Z0-9_-]+)/g));
        const idMatches = Array.from(line.matchAll(/#([a-zA-Z0-9_-]+)/g));

        if (classMatches.length > 0) {
            for (const match of classMatches) {
                const className = match[1];
                const fullMatch = match[0];
                if (!existingClasses.has(className)) {
                    const index = line.indexOf(fullMatch);
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
                if (!existingIds.has(idName)) {
                    const index = line.indexOf(fullMatch);
                    const range = new vscode.Range(i, index, i, index + fullMatch.length);
                    const diagnostic = new vscode.Diagnostic(range, `ID '#${idName}' does not exist.`, vscode.DiagnosticSeverity.Error);
                    diagnostics.push(diagnostic);
                }
            }
        }
    }

    diagnosticCollection.set(document.uri, diagnostics);
}

async function getSelectors(filePath: string, cache: Cache): Promise<{ classes: string[], ids: string[] }> {
    if (cache.has(filePath)) {
        return cache.get(filePath)!;
    }

    try {
        const fileContent: string = await readFile(filePath, 'utf8');
        const classes: string[] = [];
        const ids: string[] = [];
        let match;

        // Reset regex lastIndex before use
        classRegex.lastIndex = 0;
        classNameRegex.lastIndex = 0;
        idRegex.lastIndex = 0;

        while ((match = classRegex.exec(fileContent)) !== null) {
            classes.push(match[1] || match[2]);
        }

        while ((match = classNameRegex.exec(fileContent)) !== null) {
            classes.push(match[1] || match[2]);
        }

        while ((match = idRegex.exec(fileContent)) !== null) {
            ids.push(match[1] || match[2]);
        }

        const selectors = { classes, ids };
        cache.set(filePath, selectors);
        return selectors;
    } catch (error) {
        return { classes: [], ids: [] };
    }
}