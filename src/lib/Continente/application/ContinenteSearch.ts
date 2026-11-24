import { ContinenteRepository, ContinenteSearchResult } from "../domain/ContinenteRepository";

export class ContinenteSearch {
  constructor(private readonly repository: ContinenteRepository) {}

  async run(q: string, page: number, pageSize: number): Promise<ContinenteSearchResult> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 15;
    return this.repository.search(q.trim(), safePage, safeSize);
  }
}
