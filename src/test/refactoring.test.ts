import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { CSSRenameProvider } from '../refactoring';
import { Cache } from '../cache';

suite('Refactoring Test Suite', () => {
    let cache: Cache;
    let provider: CSSRenameProvider;

    suiteSetup(() => {
        cache = new Cache();
        provider = new CSSRenameProvider(cache);
    });

    test('Collision Detection Test', async () => {
        // Setup cache with an existing class
        const filePath = path.join(__dirname, 'test.css');
        cache.set(filePath, {
            classes: [
                { name: 'existing-class', range: new vscode.Range(0, 0, 0, 14) }
            ],
            ids: []
        });

        // Mock showWarningMessage
        const originalShowWarningMessage = vscode.window.showWarningMessage;
        let warningShown = false;
        (vscode.window as any).showWarningMessage = async (message: string, ...items: any[]) => {
            if (message.includes('already exists')) {
                warningShown = true;
            }
            return items[0]; // Assume user clicks first option (e.g., "Rename Anyway")
        };

        try {
            // Create a virtual document
            const uri = vscode.Uri.parse('untitled:test.html');
            const document = await vscode.workspace.openTextDocument({
                language: 'html',
                content: '<div class="old-class"></div>'
            });

            // We need to trigger provideRenameEdits with a newName that collisions
            const position = new vscode.Position(0, 12); // inside "old-class"
            const newName = 'existing-class';
            
            // This will call provideRenameEdits which should trigger the warning
            // Note: provideRenameEdits might fail in test environment due to findFiles
            // but we want to check if the collision detection logic is called.
            try {
                await provider.provideRenameEdits(document, position, newName, new vscode.CancellationTokenSource().token);
            } catch (e) {
                // Ignore errors from findFiles etc.
            }

            assert.strictEqual(warningShown, true, 'Warning should have been shown for existing class');

        } finally {
            vscode.window.showWarningMessage = originalShowWarningMessage;
            cache.clear();
        }
    });
});
