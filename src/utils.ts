import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Cache, Selector } from './cache';

const readFile = promisify(fs.readFile);

const classRegex = /class=(?:"([^"]*)"|'([^']*)')/g;
const classNameRegex = /className=(?:"([^"]*)"|'([^']*)')/g;
const idRegex = /id=(?:"([^"]*)"|'([^']*)')/g;

const cssClassRegex = /\.([a-zA-Z0-9_-]+)/g;
const cssIdRegex = /#([a-zA-Z0-9_-]+)/g;

// Tailwind v4 @theme blocks
const tailwindThemeRegex = /@theme\s*{([^}]*)}/g;
const tailwindThemeVariableRegex = /--([a-zA-Z0-9_-]+):/g;

// CSS Modules syntax (e.g., styles.myClass or s.myClass)
const cssModulesRegex = /(?:\s|{|=)(?:styles|s)\.([a-zA-Z0-9_-]+)/g;

/**
 * Checks if the given position is inside a CSS property value, supporting multi-line values.
 * @param document The text document.
 * @param position The position to check.
 * @returns True if the position is inside a CSS property value, false otherwise.
 */
export function isInsideCSSPropertyValue(document: vscode.TextDocument, position: vscode.Position): boolean {
    const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const lastOpeningBrace = textBeforeCursor.lastIndexOf('{');
    const lastClosingBrace = textBeforeCursor.lastIndexOf('}');

    // We are not inside a rule, so we can't be in a property value.
    if (lastOpeningBrace < lastClosingBrace) {
        return false;
    }

    const ruleContent = textBeforeCursor.substring(lastOpeningBrace + 1);
    const lastColon = ruleContent.lastIndexOf(':');
    const lastSemicolon = ruleContent.lastIndexOf(';');

    // If a colon exists after the last semicolon, we are inside a property value.
    return lastColon > lastSemicolon;
}

/**
 * Checks if the given position is inside a color value.
 * This is a heuristic check based on common color properties and functions.
 * @param document The text document.
 * @param position The position to check.
 * @returns True if the position is inside a color value, false otherwise.
 */
export function isInsideColorValue(document: vscode.TextDocument, position: vscode.Position): boolean {
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Check for common color-related properties on the current line
    const colorProperties = [
        'color:',
        'background-color:',
        'border-color:',
        'outline-color:',
        'text-decoration-color:',
        'box-shadow:',
        'text-shadow:'
    ];

    const isColorProperty = colorProperties.some(prop => lineText.includes(prop));

    // Check if inside a color function like rgba(), hsl(), or a var() function
    const inColorFunction = /rgba?\s*\(|hsla?\s*\(|var\s*\(/.test(textBeforeCursor);

    return isColorProperty || inColorFunction;
}

export function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<F>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function offsetToPosition(text: string, offset: number): vscode.Position {
    const lines = text.substring(0, offset).split('\n');
    const line = lines.length - 1;
    const character = lines[line].length;
    return new vscode.Position(line, character);
}

export async function getSelectors(filePath: string, cache: Cache): Promise<{ classes: Selector[], ids: Selector[] }> {
    if (cache.has(filePath)) {
        return cache.get(filePath)!;
    }

    const ext = path.extname(filePath).toLowerCase();
    const isCssFile = ['.css', '.scss', '.sass', '.less', '.styl'].includes(ext);

    try {
        const fileContent: string = await readFile(filePath, 'utf8');
        const classes: Selector[] = [];
        const ids: Selector[] = [];
        let match;

        if (isCssFile) {
            cssClassRegex.lastIndex = 0;
            cssIdRegex.lastIndex = 0;
            tailwindThemeRegex.lastIndex = 0;

            while ((match = cssClassRegex.exec(fileContent)) !== null) {
                const startPos = offsetToPosition(fileContent, match.index);
                const endPos = offsetToPosition(fileContent, match.index + match[0].length);
                classes.push({ name: match[1], range: new vscode.Range(startPos, endPos) });
            }

            while ((match = cssIdRegex.exec(fileContent)) !== null) {
                const startPos = offsetToPosition(fileContent, match.index);
                const endPos = offsetToPosition(fileContent, match.index + match[0].length);
                ids.push({ name: match[1], range: new vscode.Range(startPos, endPos) });
            }

            // Tailwind v4 @theme
            while ((match = tailwindThemeRegex.exec(fileContent)) !== null) {
                const themeContent = match[1];
                const themeOffset = match.index + match[0].indexOf(themeContent);
                let varMatch;
                tailwindThemeVariableRegex.lastIndex = 0;
                while ((varMatch = tailwindThemeVariableRegex.exec(themeContent)) !== null) {
                    const startPos = offsetToPosition(fileContent, themeOffset + varMatch.index);
                    const endPos = offsetToPosition(fileContent, themeOffset + varMatch.index + varMatch[0].length - 1); // remove trailing colon
                    classes.push({ name: varMatch[1], range: new vscode.Range(startPos, endPos) });
                }
            }
        } else {
            // Reset regex lastIndex before use
            classRegex.lastIndex = 0;
            classNameRegex.lastIndex = 0;
            idRegex.lastIndex = 0;
            cssModulesRegex.lastIndex = 0;

            const processMatch = (match: RegExpExecArray, type: 'class' | 'id') => {
                const value = match[1] || match[2];
                if (!value) return;

                // The value might be multiple classes separated by spaces
                const parts = value.split(/\s+/);
                let searchIndex = 0;

                for (const part of parts) {
                    if (part) {
                        const partIndex = value.indexOf(part, searchIndex);
                        const currentOffset = match.index + match[0].indexOf(value) + partIndex;
                        
                        const startPos = offsetToPosition(fileContent, currentOffset);
                        const endPos = offsetToPosition(fileContent, currentOffset + part.length);
                        const selector: Selector = {
                            name: part,
                            range: new vscode.Range(startPos, endPos)
                        };
                        if (type === 'class') {
                            classes.push(selector);
                        } else {
                            ids.push(selector);
                        }
                        searchIndex = partIndex + part.length;
                    }
                }
            };

            while ((match = classRegex.exec(fileContent)) !== null) {
                processMatch(match, 'class');
            }

            while ((match = classNameRegex.exec(fileContent)) !== null) {
                processMatch(match, 'class');
            }

            while ((match = idRegex.exec(fileContent)) !== null) {
                processMatch(match, 'id');
            }

            // CSS Modules
            while ((match = cssModulesRegex.exec(fileContent)) !== null) {
                const className = match[1];
                const startPos = offsetToPosition(fileContent, match.index + match[0].indexOf(className));
                const endPos = offsetToPosition(fileContent, match.index + match[0].indexOf(className) + className.length);
                classes.push({ name: className, range: new vscode.Range(startPos, endPos) });
            }
        }

        const selectors = { classes, ids };
        cache.set(filePath, selectors);
        return selectors;
    } catch (error) {
        return { classes: [], ids: [] };
    }
}
