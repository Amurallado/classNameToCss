import * as vscode from 'vscode';
import * as path from 'path';
import { Cache, Selector } from './cache';
import { getSelectors } from './utils';

export class CSSDefinitionProvider implements vscode.DefinitionProvider {
    constructor(private cache: Cache) {}

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | vscode.Location[] | vscode.DefinitionLink[] | undefined> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return undefined;
        }

        const word = document.getText(range);
        
        // Find if we are inside a class="" or id="" attribute
        const lineText = document.lineAt(position.line).text;
        const classMatch = lineText.match(/class(?:Name)?=["']([^"']*)["']/);
        const idMatch = lineText.match(/id=["']([^"']*)["']/);

        let isClass = false;
        let isId = false;

        if (classMatch) {
            const classes = classMatch[1].split(/\s+/);
            if (classes.includes(word)) {
                isClass = true;
            }
        }

        if (idMatch && idMatch[1] === word) {
            isId = true;
        }

        if (!isClass && !isId) {
            return undefined;
        }

        const cssExtensions = ['css', 'scss', 'sass', 'less', 'styl'];
        const files = await vscode.workspace.findFiles(`**/*.{${cssExtensions.join(',')}}`, '**/node_modules/**');
        const locations: vscode.Location[] = [];

        for (const file of files) {
            const selectors = await getSelectors(file.fsPath, this.cache);
            const searchArray = isClass ? selectors.classes : selectors.ids;
            
            for (const selector of searchArray) {
                if (selector.name === word) {
                    locations.push(new vscode.Location(file, selector.range));
                }
            }
        }

        return locations;
    }
}

export class CSSReferenceProvider implements vscode.ReferenceProvider {
    constructor(private cache: Cache) {}

    async provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken
    ): Promise<vscode.Location[] | undefined> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return undefined;
        }

        const word = document.getText(range);
        const lineText = document.lineAt(position.line).text;
        
        // Ensure we are on a selector (.class or #id)
        const isClass = lineText.substring(Math.max(0, range.start.character - 1), range.start.character) === '.';
        const isId = lineText.substring(Math.max(0, range.start.character - 1), range.start.character) === '#';

        if (!isClass && !isId) {
            return undefined;
        }

        const config = vscode.workspace.getConfiguration('cssselectorsupport');
        const fileExtensions = config.get<string[]>('include', ['htm', 'html', 'jsx', 'tsx', 'vue', 'php']);
        
        const files = await vscode.workspace.findFiles(`**/*.{${fileExtensions.join(',')}}`, '**/node_modules/**');
        const locations: vscode.Location[] = [];

        for (const file of files) {
            const selectors = await getSelectors(file.fsPath, this.cache);
            const searchArray = isClass ? selectors.classes : selectors.ids;
            
            for (const selector of searchArray) {
                if (selector.name === word) {
                    locations.push(new vscode.Location(file, selector.range));
                }
            }
        }

        return locations;
    }
}

export function registerDefinitionProvider(context: vscode.ExtensionContext, cache: Cache) {
    const defProvider = new CSSDefinitionProvider(cache);
    const refProvider = new CSSReferenceProvider(cache);
    const markupLanguages = ['html', 'php', 'vue', 'javascriptreact', 'typescriptreact', 'javascript', 'typescript'];
    const cssLanguages = ['css', 'scss', 'sass', 'less', 'styl', 'vue'];
    
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            markupLanguages.map(language => ({ scheme: 'file', language })),
            defProvider
        ),
        vscode.languages.registerReferenceProvider(
            cssLanguages.map(language => ({ scheme: 'file', language })),
            refProvider
        )
    );
}
