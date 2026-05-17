import * as vscode from 'vscode';
import { Cache } from './cache';
import * as path from 'path';

export class CSSRenameProvider implements vscode.RenameProvider {
    constructor(private cache: Cache) {}

    async prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Range | { range: vscode.Range, placeholder: string }> {
        const ext = path.extname(document.fileName).toLowerCase();
        const isCssFile = ['.css', '.scss', '.sass', '.less', '.styl'].includes(ext) || 
                          ['css', 'scss', 'sass', 'less', 'stylus'].includes(document.languageId);

        if (isCssFile) {
            const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_-]+/);
            if (range) {
                // Check if the character before the word is . or #
                if (range.start.character > 0) {
                    const prefix = document.getText(new vscode.Range(range.start.translate(0, -1), range.start));
                    if (prefix === '.' || prefix === '#') {
                        return range;
                    }
                }
            }
        } else {
            // Check if we are inside a class or id attribute
            const line = document.lineAt(position.line).text;
            const classMatch = line.match(/class(?:Name)?=["']([^"']*)["']/g);
            const idMatch = line.match(/id=["']([^"']*)["']/g);

            if (classMatch) {
                for (const match of classMatch) {
                    const start = line.indexOf(match);
                    const end = start + match.length;
                    if (position.character >= start && position.character <= end) {
                        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_-]+/);
                        if (wordRange) return wordRange;
                    }
                }
            }
            if (idMatch) {
                for (const match of idMatch) {
                    const start = line.indexOf(match);
                    const end = start + match.length;
                    if (position.character >= start && position.character <= end) {
                        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_-]+/);
                        if (wordRange) return wordRange;
                    }
                }
            }
        }

        throw new Error('You cannot rename this element.');
    }

    async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): Promise<vscode.WorkspaceEdit> {
        const range = await this.prepareRename(document, position, token);
        if (!range) return null as any;

        const editRange = (range as any).range || range;
        const oldName = document.getText(editRange);
        const edit = new vscode.WorkspaceEdit();

        const ext = path.extname(document.fileName).toLowerCase();
        const isCssFile = ['.css', '.scss', '.sass', '.less', '.styl'].includes(ext) || 
                          ['css', 'scss', 'sass', 'less', 'stylus'].includes(document.languageId);

        let type: 'class' | 'id' = 'class';
        if (isCssFile) {
            if (editRange.start.character > 0) {
                const prefix = document.getText(new vscode.Range(editRange.start.translate(0, -1), editRange.start));
                type = prefix === '#' ? 'id' : 'class';
            }
        } else {
            const line = document.lineAt(position.line).text;
            // More specific check for id attribute
            const idMatch = line.match(/id=["']([^"']*)["']/);
            if (idMatch) {
                const idValue = idMatch[1];
                const start = line.indexOf(`id="${idValue}"`);
                const end = start + idMatch[0].length;
                if (position.character >= start && position.character <= end) {
                    type = 'id';
                }
            }
        }

        // Add edit for the current document (important for virtual docs in tests)
        if (document.uri.scheme === 'untitled' || document.uri.scheme === 'vsls') {
             this.applyEditsToDocument(document, type, oldName, newName, edit);
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return edit;
        }

        // Find all occurrences in all files
        const files = await vscode.workspace.findFiles('**/*.{html,htm,php,vue,jsx,tsx,css,scss,sass,less,styl}');
        
        for (const file of files) {
            const fileDocument = await vscode.workspace.openTextDocument(file);
            this.applyEditsToDocument(fileDocument, type, oldName, newName, edit);
        }

        return edit;
    }

    private applyEditsToDocument(fileDocument: vscode.TextDocument, type: 'class' | 'id', oldName: string, newName: string, edit: vscode.WorkspaceEdit) {
        const content = fileDocument.getText();
        const ext = path.extname(fileDocument.fileName).toLowerCase();
        const isCss = ['.css', '.scss', '.sass', '.less', '.styl'].includes(ext) || 
                      ['css', 'scss', 'sass', 'less', 'stylus'].includes(fileDocument.languageId);

        if (isCss) {
            const regex = type === 'class' ? new RegExp(`\\.(${oldName})(?![a-zA-Z0-9_-])`, 'g') : new RegExp(`#(${oldName})(?![a-zA-Z0-9_-])`, 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
                const startPos = fileDocument.positionAt(match.index + 1);
                const endPos = fileDocument.positionAt(match.index + match[0].length);
                edit.replace(fileDocument.uri, new vscode.Range(startPos, endPos), newName);
            }
        } else {
            const attrRegex = type === 'class' ? /class(?:Name)?=["']([^"']*)["']/g : /id=["']([^"']*)["']/g;
            let match;
            while ((match = attrRegex.exec(content)) !== null) {
                const value = match[1];
                const parts = value.split(/\s+/);
                let searchIndex = 0;
                for (const part of parts) {
                    if (part === oldName) {
                        const partIndex = value.indexOf(part, searchIndex);
                        const startOffset = match.index + match[0].indexOf(value) + partIndex;
                        const startPos = fileDocument.positionAt(startOffset);
                        const endPos = fileDocument.positionAt(startOffset + part.length);
                        edit.replace(fileDocument.uri, new vscode.Range(startPos, endPos), newName);
                        searchIndex = partIndex + part.length;
                    } else {
                        searchIndex += part.length + 1;
                    }
                }
            }
        }
    }
}
