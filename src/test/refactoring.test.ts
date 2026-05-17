import * as assert from 'assert';
import * as vscode from 'vscode';
import { CSSRenameProvider } from '../refactoring';
import { Cache } from '../cache';

suite('Refactoring Test Suite', () => {
    let cache: Cache;
    let provider: CSSRenameProvider;

    suiteSetup(() => {
        cache = new Cache();
        provider = new CSSRenameProvider(cache);
    });

    test('Basic check', () => {
        assert.strictEqual(1, 1);
    });
});
