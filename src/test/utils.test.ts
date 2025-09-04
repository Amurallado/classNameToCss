import * as assert from 'assert';
import * as vscode from 'vscode';
import { isInsideCSSPropertyValue, isInsideColorValue } from '../utils';

suite('Utils Test Suite', () => {
    const createMockDocument = (content: string): vscode.TextDocument => {
        return {
            lineAt: (position: vscode.Position | number) => {
                const lineNum = typeof position === 'number' ? position : position.line;
                const lines = content.split('\n');
                return {
                    text: lines[lineNum],
                    range: new vscode.Range(new vscode.Position(lineNum, 0), new vscode.Position(lineNum, lines[lineNum].length)),
                    firstNonWhitespaceCharacterIndex: 0,
                    isEmptyOrWhitespace: false,
                    lineNumber: lineNum,
                    rangeIncludingLineBreak: new vscode.Range(new vscode.Position(lineNum, 0), new vscode.Position(lineNum, lines[lineNum].length)),
                };
            },
            getText: () => content,
        } as vscode.TextDocument;
    };

    suite('isInsideCSSPropertyValue', () => {
        test('should return true when inside a property value', () => {
            const doc = createMockDocument('body { color: #fff; }');
            const position = new vscode.Position(0, 15);
            assert.strictEqual(isInsideCSSPropertyValue(doc, position), true);
        });

        test('should return false when outside a property value', () => {
            const doc = createMockDocument('body { color: #fff; }');
            const position = new vscode.Position(0, 5);
            assert.strictEqual(isInsideCSSPropertyValue(doc, position), false);
        });

        test('should return false on a line with no colon', () => {
            const doc = createMockDocument('body { font-size: 16px }');
            const position = new vscode.Position(0, 5);
            assert.strictEqual(isInsideCSSPropertyValue(doc, position), false);
        });
    });

    suite('isInsideColorValue', () => {
        test('should return true when after a color property', () => {
            const doc = createMockDocument('body { color: #fff; }');
            const position = new vscode.Position(0, 15);
            assert.strictEqual(isInsideColorValue(doc, position), true);
        });

        test('should return true when inside rgba', () => {
            const doc = createMockDocument('body { background: rgba(0,0,0,0.5); }');
            const position = new vscode.Position(0, 25);
            assert.strictEqual(isInsideColorValue(doc, position), true);
        });

        test('should return false for non-color properties', () => {
            const doc = createMockDocument('body { font-size: 16px; }');
            const position = new vscode.Position(0, 18);
            assert.strictEqual(isInsideColorValue(doc, position), false);
        });
    });
});
