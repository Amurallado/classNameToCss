import * as path from "path";
import * as vscode from "vscode";
import { Cache, Selector } from "./cache";
import { isInsideCSSPropertyValue, isInsideColorValue, getSelectors } from "./utils";
import * as fs from "fs";
import { promisify } from "util";

const classRegex = /class=(?:"([^"]*)"|'([^']*)')/g;
const classNameRegex = /className=(?:"([^"]*)"|'([^']*)')/g;
const idRegex = /id=(?:"([^"]*)"|'([^']*)')/g;

export const fileListCache = new Map<string, string[]>();

function getLocalSelectors(document: vscode.TextDocument): { classes: Set<string>, ids: Set<string> } {
    const localClasses = new Set<string>();
    const localIds = new Set<string>();
    const text = document.getText();
    const classRegex = /\.([a-zA-Z0-9_-]+)/g;
    const idRegex = /#([a-zA-Z0-9_-]+)/g;
    let match;

    while ((match = classRegex.exec(text)) !== null) {
        localClasses.add(match[1]);
    }

    while ((match = idRegex.exec(text)) !== null) {
        localIds.add(match[1]);
    }

    return { classes: localClasses, ids: localIds };
}

async function provideCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  cache: Cache
) {
  const line = document.lineAt(position);
  const triggerCharacter = line.text.substring(position.character - 1, position.character);

  if (triggerCharacter !== "." && triggerCharacter !== "#") {
    return;
  }

  if (isInsideCSSPropertyValue(document, position) || isInsideColorValue(document, position)) {
    return;
  }

  const config = vscode.workspace.getConfiguration("cssselectorsupport");
  const fileExtensions = config.get<string[]>("include", [
    "htm",
    "html",
    "jsx",
    "tsx",
    "vue",
    "php"
  ]);

  const sourceFiles = config.get<string[]>("sourceFiles", []);

  let selectorArrays: { classes: Selector[], ids: Selector[] }[] = [];

  if (document.languageId === "vue") {
    selectorArrays.push(await getSelectors(document.fileName, cache));
  } else {
    let filesToScan: string[] = [];
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (sourceFiles.length > 0) {
        const sourcePromises = sourceFiles.map(pattern => vscode.workspace.findFiles(pattern, "**/node_modules/**"));
        const foundFiles = (await Promise.all(sourcePromises)).flat();
        filesToScan = foundFiles.map(uri => uri.fsPath);
    } else if (workspaceFolder) {
        const workspacePath = workspaceFolder.uri.fsPath;
        if (fileListCache.has(workspacePath)) {
            filesToScan = fileListCache.get(workspacePath)!;
        } else {
            const filesInWorkspace = await vscode.workspace.findFiles(
                new vscode.RelativePattern(workspaceFolder, `**/*.{${fileExtensions.join(',')}}`),
                '**/node_modules/**'
            );
            filesToScan = filesInWorkspace.map(uri => uri.fsPath);
            fileListCache.set(workspacePath, filesToScan);
        }
    } else if (!document.isUntitled) {
        const currentDir = path.dirname(document.uri.fsPath);
        try {
            const filesInDir = await promisify(fs.readdir)(currentDir);
            const filteredFiles = filesInDir.filter(file => {
                const ext = file.split('.').pop();
                // Basic path traversal prevention
                const isSafe = !file.includes('..') && !file.includes('/') && !file.includes('\\');
                return isSafe && ext !== undefined && fileExtensions.includes(ext);
            });
            filesToScan = filteredFiles.map(file => path.join(currentDir, file));
        } catch (e) {
            filesToScan = [];
        }
    }

    const selectorPromises = filesToScan.map((filePath) => {
        return getSelectors(filePath, cache);
    });
    selectorArrays = await Promise.all(selectorPromises);
  }

  const { classes: localClasses, ids: localIds } = getLocalSelectors(document);
  const COMPLETION_LIMIT = 500;

  if (triggerCharacter === ".") {
    const allClassNames = selectorArrays.flatMap(s => s.classes).map(c => c.name).flatMap(c => c.split(' ')).filter(Boolean);
    const uniqueClassNames = [...new Set(allClassNames)].filter(c => !localClasses.has(c));
    return uniqueClassNames.slice(0, COMPLETION_LIMIT).map((ele: string) => {
      return new vscode.CompletionItem(
        `.${ele}`,
        vscode.CompletionItemKind.Text
      );
    });
  }

  if (triggerCharacter === "#") {
    const allIds = selectorArrays.flatMap(s => s.ids).map(i => i.name).filter(Boolean);
    const uniqueIds = [...new Set(allIds)].filter(id => !localIds.has(id));
    return uniqueIds.slice(0, COMPLETION_LIMIT).map((ele: string) => {
      return new vscode.CompletionItem(
        `#${ele}`,
        vscode.CompletionItemKind.Text
      );
    });
  }
}

function resolveCompletionItem() {
  return null;
}


export default function (context: vscode.ExtensionContext, cache: Cache): void {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      [
        { scheme: "file", language: "css" },
        { scheme: "file", language: "less" },
        { scheme: "file", language: "scss" },
        { scheme: "file", language: "sass" },
        { scheme: "file", language: "stylus" },
        { scheme: "file", language: "vue" },
      ],
      {
        provideCompletionItems: (document, position, token, context) => {
          return provideCompletionItems(document, position, cache);
        },
        resolveCompletionItem,
      },
      ".", "#"
    )
  );
}
