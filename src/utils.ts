import * as vscode from 'vscode';

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