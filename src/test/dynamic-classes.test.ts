import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { getSelectors } from '../utils';
import { Cache } from '../cache';

suite('Dynamic Classes Test Suite', () => {
    const testDir = path.join(__dirname, 'test-temp-dynamic');
    const cache = new Cache();

    suiteSetup(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir);
        }
    });

    suiteTeardown(() => {
        if (fs.existsSync(testDir)) {
            const files = fs.readdirSync(testDir);
            for (const file of files) {
                fs.unlinkSync(path.join(testDir, file));
            }
            fs.rmdirSync(testDir);
        }
    });

    test('extracts classes from template literals', async () => {
        const jsPath = path.join(testDir, 'template.js');
        const content = "const className = `btn ${active ? 'active' : 'inactive'} container`;";
        fs.writeFileSync(jsPath, content);
        
        cache.delete(jsPath);
        const selectors = await getSelectors(jsPath, cache);
        
        const classNames = selectors.classes.map(c => c.name);
        assert.ok(classNames.includes('btn'), 'Should include btn');
        assert.ok(classNames.includes('container'), 'Should include container');
        assert.ok(classNames.includes('active'), 'Should include active');
        assert.ok(classNames.includes('inactive'), 'Should include inactive');
    });

    test('extracts classes from clsx/classNames calls', async () => {
        const jsPath = path.join(testDir, 'clsx.js');
        const content = "clsx('btn', { 'btn-primary': true }, ['main-content', 'p-4']);";
        fs.writeFileSync(jsPath, content);
        
        cache.delete(jsPath);
        const selectors = await getSelectors(jsPath, cache);
        
        const classNames = selectors.classes.map(c => c.name);
        assert.ok(classNames.includes('btn'));
        assert.ok(classNames.includes('btn-primary'));
        assert.ok(classNames.includes('main-content'));
        assert.ok(classNames.includes('p-4'));
    });
});
