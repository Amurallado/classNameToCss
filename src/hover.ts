import * as vscode from 'vscode';
import { Cache } from './cache';
import { getSelectors } from './utils';
import * as fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export class CSSHoverProvider implements vscode.HoverProvider {
    constructor(private cache: Cache) {}

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return undefined;
        }

        const word = document.getText(range);
        const lineText = document.lineAt(position.line).text;
        
        // Check if the word is likely a class or id in markup
        const classRegex = new RegExp(`class(?:Name)?=["'][^"']*?\\b${word}\\b[^"']*?["']`);
        const idRegex = new RegExp(`id=["'][^"']*?\\b${word}\\b[^"']*?["']`);
        const isClassMatch = classRegex.test(lineText);
        const isIdMatch = idRegex.test(lineText);

        if (!isClassMatch && !isIdMatch) {
            // Also check for CSS Modules syntax
            const cssModulesRegex = new RegExp(`(?:styles|s)\\.${word}\\b`);
            if (!cssModulesRegex.test(lineText)) {
                return undefined;
            }
        }
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return undefined;
        }

        for (const folder of workspaceFolders) {
            const cssFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*.{css,scss,sass,less,styl}'));
            for (const file of cssFiles) {
                const selectors = await getSelectors(file.fsPath, this.cache);
                const selector = selectors.classes.find(c => c.name === word) || selectors.ids.find(i => i.name === word);
                
                if (selector) {
                    const cssContent = await readFile(file.fsPath, 'utf8');
                    const rule = this.extractRule(cssContent, selector.range.start);
                    if (rule) {
                        const markdown = new vscode.MarkdownString();
                        markdown.appendCodeblock(rule, 'css');
                        return new vscode.Hover(markdown, range);
                    }
                }
            }
        }

        return undefined;
    }

    private extractRule(content: string, startPos: vscode.Position): string | undefined {
        const lines = content.split('\n');
        let rule = '';
        let braceCount = 0;
        let started = false;

        for (let i = startPos.line; i < lines.length; i++) {
            const line = i === startPos.line ? lines[i].substring(0) : lines[i];
            rule += (i === startPos.line ? '' : '\n') + line;

            for (let j = 0; j < line.length; j++) {
                if (line[j] === '{') {
                    braceCount++;
                    started = true;
                } else if (line[j] === '}') {
                    braceCount--;
                }
            }

            if (started && braceCount === 0) {
                return rule.trim();
            }
        }

        return undefined;
    }
}
