/**
 * Cache em memória (LRU) de capítulos bíblicos já lidos do IndexedDB.
 * Só presentação/velocidade: nada é gravado, e a memória some ao fechar o app.
 */
export interface CachedVerse {
  verse: number;
}

export class ChapterCache<T extends CachedVerse> {
  private map = new Map<string, T[]>();
  constructor(private readonly limit = 60) {}

  static key(libId: string, bookId: string, chapter: number): string {
    return `${libId}:${bookId}:${chapter}`;
  }

  get(key: string): T[] | undefined {
    const v = this.map.get(key);
    if (v) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }

  set(key: string, value: T[]): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clearLibrary(libId: string): void {
    for (const k of [...this.map.keys()]) if (k.startsWith(`${libId}:`)) this.map.delete(k);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
