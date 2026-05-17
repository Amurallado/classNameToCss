import * as assert from 'assert';
import * as vscode from 'vscode';
import { Cache } from '../cache';

suite('Cache Test Suite', () => {
  test('should store and retrieve selectors with ranges', () => {
    const cache = new Cache();
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));
    const selector = { name: 'my-class', range };
    
    // This will fail to compile first because Cache is not yet updated
    cache.set('file1.css', { classes: [selector], ids: [] });
    
    const result = cache.get('file1.css');
    assert.ok(result);
    assert.strictEqual(result.classes.length, 1);
    assert.strictEqual(result.classes[0].name, 'my-class');
    assert.deepStrictEqual(result.classes[0].range, range);
  });
});
