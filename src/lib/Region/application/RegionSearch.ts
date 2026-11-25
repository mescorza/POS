import { RegionRepository, RegionSearchResult } from "../domain/RegionRepository";

export class RegionSearch {
  constructor(private readonly repository: RegionRepository) {}

  async run(q: string, page: number, pageSize: number): Promise<RegionSearchResult> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 15;
    return this.repository.search(q.trim(), safePage, safeSize);
  }
}
