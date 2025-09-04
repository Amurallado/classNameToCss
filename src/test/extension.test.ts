import * as assert from 'assert';
import * as vscode from 'vscode';
import { isInsideCSSPropertyValue, isInsideColorValue } from '../utils';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('Amurallado.css-selector-support'));
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('Amurallado.css-selector-support');
		await extension?.activate();
		assert.ok(extension?.isActive);
	});

    suite('Utils Test Suite', () => {
        let doc: vscode.TextDocument;

        suiteSetup(async () => {
            doc = await vscode.workspace.openTextDocument({ content: '', language: 'css' });
        });

        test('isInsideCSSPropertyValue should return true when inside a property value', () => {
            const position = new vscode.Position(0, 15);
            const newDoc = vscode.workspace.openTextDocument({ content: 'body { color: #fff; }', language: 'css' });
            newDoc.then(doc => {
                assert.ok(isInsideCSSPropertyValue(doc, position));
            });
        });

        test('isInsideColorValue should return true for color properties', () => {
            const position = new vscode.Position(0, 10);
            const newDoc = vscode.workspace.openTextDocument({ content: 'color: red;', language: 'css' });
            newDoc.then(doc => {
                assert.ok(isInsideColorValue(doc, position));
            });
        });
    });
});
