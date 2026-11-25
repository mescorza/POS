import { PaisRepository, PaisSearchResult } from "../domain/PaisRepository";

export class PaisSearch {
  constructor(private readonly repository: PaisRepository) {}

  async run(q: string, page: number, pageSize: number): Promise<PaisSearchResult> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 15;
    return this.repository.search(q.trim(), safePage, safeSize);
  }
}
