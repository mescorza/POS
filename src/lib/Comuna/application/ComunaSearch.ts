import { ComunaRepository, ComunaSearchResult } from "../domain/ComunaRepository";

export class ComunaSearch {
  constructor(private readonly repository: ComunaRepository) {}

  async run(q: string, page: number, pageSize: number): Promise<ComunaSearchResult> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 15;
    return this.repository.search(q.trim(), safePage, safeSize);
  }
}
