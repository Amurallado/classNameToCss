import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getSelectors } from '../utils';
import { Cache } from '../cache';

suite('Framework Support Test Suite', () => {
    const testDir = path.join(__dirname, 'test-temp');
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

    test('Tailwind v4 @theme variable parsing', async () => {
        const cssPath = path.join(testDir, 'tailwind.css');
        const content = `
            @theme {
                --color-brand: #3b82f6;
                --spacing-sm: 0.5rem;
            }
            .normal-class { color: red; }
        `;
        fs.writeFileSync(cssPath, content);
        
        cache.delete(cssPath);
        const selectors = await getSelectors(cssPath, cache);
        
        const classNames = selectors.classes.map(c => c.name);
        assert.ok(classNames.includes('color-brand'));
        assert.ok(classNames.includes('spacing-sm'));
        assert.ok(classNames.includes('normal-class'));
    });

    test('CSS Modules syntax parsing (styles.className)', async () => {
        const jsPath = path.join(testDir, 'component.jsx');
        const content = `
            function Component() {
                return (
                    <div className={styles.container}>
                        <span className={s.label}>Hello</span>
                        <div class={styles.card}></div>
                    </div>
                );
            }
        `;
        fs.writeFileSync(jsPath, content);
        
        cache.delete(jsPath);
        const selectors = await getSelectors(jsPath, cache);
        
        const classNames = selectors.classes.map(c => c.name);
        assert.ok(classNames.includes('container'));
        assert.ok(classNames.includes('label'));
        assert.ok(classNames.includes('card'));
    });

    test('CSS Modules syntax parsing in template strings', async () => {
        const jsPath = path.join(testDir, 'template.js');
        const content = `
            const html = \`<div class="\${styles.foo} \${s.bar}"></div>\`;
        `;
        fs.writeFileSync(jsPath, content);
        
        cache.delete(jsPath);
        const selectors = await getSelectors(jsPath, cache);
        
        const classNames = selectors.classes.map(c => c.name);
        assert.ok(classNames.includes('foo'));
        assert.ok(classNames.includes('bar'));
    });
});
