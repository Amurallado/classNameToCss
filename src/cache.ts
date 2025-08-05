export class Cache {
  private cache: Map<string, { classes: string[], ids: string[] }> = new Map();

  public get(key: string): { classes: string[], ids: string[] } | undefined {
    return this.cache.get(key);
  }

  public set(key: string, value: { classes: string[], ids: string[] }): void {
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
}