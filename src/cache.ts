import * as vscode from 'vscode';

export interface Selector {
  name: string;
  range: vscode.Range;
}

export class Cache {
  private cache: Map<string, { classes: Selector[], ids: Selector[] }> = new Map();

  public get(key: string): { classes: Selector[], ids: Selector[] } | undefined {
    return this.cache.get(key);
  }

  public set(key: string, value: { classes: Selector[], ids: Selector[] }): void {
    this.cache.set(key, value);
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public getAll(): Map<string, { classes: Selector[], ids: Selector[] }> {
    return new Map(this.cache);
  }
}