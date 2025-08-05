import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { promisify } from "util";
import { Cache } from "./cache";

const readFile = promisify(fs.readFile);

const classRegex = /class=(?:"([^"]*)"|'([^']*)')/g;
const classNameRegex = /className=(?:"([^"]*)"|'([^']*)')/g;
const idRegex = /id=(?:"([^"]*)"|'([^']*)')/g;

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

  const config = vscode.workspace.getConfiguration("cssselectorsupport");
  const fileExtensions = config.get<string[]>("include", [
    "htm",
    "html",
    "jsx",
    "tsx",
    "vue",
  ]);

  const sourceFiles = config.get<string[]>("sourceFiles", []);

  let selectorArrays: { classes: string[], ids: string[] }[] = [];

  if (document.languageId === "vue") {
    selectorArrays.push(await getSelectors(document.fileName, cache));
  } else {
    let filesToScan: string[] = [];
    if (sourceFiles.length > 0) {
        const sourcePromises = sourceFiles.map(pattern => vscode.workspace.findFiles(pattern, "**/node_modules/**"));
        const foundFiles = (await Promise.all(sourcePromises)).flat();
        filesToScan = foundFiles.map(uri => uri.fsPath);
    } else {
        const currentDir = path.dirname(document.uri.fsPath);
        try {
            const filesInDir = await promisify(fs.readdir)(currentDir);
            const filteredFiles = filesInDir.filter(file => {
                const ext = file.split('.').pop();
                return ext !== undefined && fileExtensions.includes(ext);
            });
            filesToScan = filteredFiles.map(file => path.join(currentDir, file));
        } catch (e) {
            // Silently ignore errors
            filesToScan = [];
        }
    }

    const selectorPromises = filesToScan.map((filePath) => {
        return getSelectors(filePath, cache);
    });
    selectorArrays = await Promise.all(selectorPromises);
  }

  if (triggerCharacter === ".") {
    const allClassNames = selectorArrays.flatMap(s => s.classes).flatMap(c => c.split(' ')).filter(Boolean);
    const uniqueClassNames = [...new Set(allClassNames)];
    return uniqueClassNames.map((ele: string) => {
      return new vscode.CompletionItem(
        `.${ele}`,
        vscode.CompletionItemKind.Text
      );
    });
  }

  if (triggerCharacter === "#") {
    const allIds = selectorArrays.flatMap(s => s.ids).filter(Boolean);
    const uniqueIds = [...new Set(allIds)];
    return uniqueIds.map((ele: string) => {
      return new vscode.CompletionItem(
        `#${ele}`,
        vscode.CompletionItemKind.Text
      );
    });
  }
}

async function getSelectors(path: string, cache: Cache): Promise<{ classes: string[], ids: string[] }> {
    if (cache.has(path)) {
        return cache.get(path)!;
    }

  try {
    const data: string = await readFile(path, "utf8");
    const fileContent = data;

    const classes: string[] = [];
    let match;

    while ((match = classRegex.exec(fileContent)) !== null) {
      classes.push(match[1] || match[2]);
    }

    while ((match = classNameRegex.exec(fileContent)) !== null) {
      classes.push(match[1] || match[2]);
    }

    const ids: string[] = [];
    while ((match = idRegex.exec(fileContent)) !== null) {
        ids.push(match[1] || match[2]);
    }

    const selectors = { classes, ids };
    cache.set(path, selectors);
    return selectors;
  } catch (error) {
    // Silently ignore errors
    return { classes: [], ids: [] };
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
        provideCompletionItems: (document, position) => {
          return provideCompletionItems(document, position, cache);
        },
        resolveCompletionItem,
      },
      ".", "#"
    )
  );
}