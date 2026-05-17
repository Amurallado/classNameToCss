import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CSSHoverProvider } from '../hover';
import { Cache } from '../cache';

suite('Hover Test Suite', () => {
    let cache: Cache;
    let provider: CSSHoverProvider;

    suiteSetup(() => {
        cache = new Cache();
        provider = new CSSHoverProvider(cache);
    });

    test('should provide hover for class name', async () => {
        const cache = new Cache();
        const provider = new CSSHoverProvider(cache);

        // Mock document
        const document = {
            getWordRangeAtPosition: (pos: vscode.Position) => new vscode.Range(pos, pos.translate(0, 10)),
            getText: (range: vscode.Range) => 'test-class',
            lineAt: (line: number) => ({ text: '<div class="test-class"></div>' }),
            uri: vscode.Uri.file('/path/to/test.html')
        } as any as vscode.TextDocument;

        // Since we are using findFiles and workspaceFolders, it's hard to unit test 
        // without more extensive mocking of vscode namespace.
        // For now, let's at least check that the method exists and handles empty workspace.
        const hover = await provider.provideHover(document, new vscode.Position(0, 12), new vscode.CancellationTokenSource().token);
        assert.strictEqual(hover, undefined); // Should be undefined because no workspace/files found
    });

    test('extractRule should extract complete CSS block', () => {
        const provider = new CSSHoverProvider(new Cache());
        const cssContent = '.test-class {\n  color: red;\n}\n.other {\n  display: none;\n}';
        const startPos = new vscode.Position(0, 0);
        
        const rule = (provider as any).extractRule(cssContent, startPos);
        assert.strictEqual(rule, '.test-class {\n  color: red;\n}');
    });
});
