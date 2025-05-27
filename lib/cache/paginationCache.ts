// lib/cache/paginationCache.ts
export class PaginationCache {
  private static instance: PaginationCache;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 60 * 1000; // 1 minute TTL for pagination

  static getInstance(): PaginationCache {
    if (!PaginationCache.instance) {
      PaginationCache.instance = new PaginationCache();
    }
    return PaginationCache.instance;
  }

  generateKey(params: {
    endpoint: string;
    category?: string;
    page?: number;
    offset?: number;
    size?: number;
    authorId?: number;
    tagId?: number;
    slug?: string;
  }): string {
    const parts = [params.endpoint];

    if (params.category) parts.push(`cat:${params.category}`);
    if (params.slug) parts.push(`slug:${params.slug}`);
    if (params.page !== undefined) parts.push(`page:${params.page}`);
    if (params.offset !== undefined) parts.push(`offset:${params.offset}`);
    if (params.size !== undefined) parts.push(`size:${params.size}`);
    if (params.authorId) parts.push(`author:${params.authorId}`);
    if (params.tagId) parts.push(`tag:${params.tagId}`);

    return parts.join(":");
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Clear all entries for a specific category
  invalidateCategory(category: string): void {
    if (!category) return;

    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      // Check if the key contains this category in any form
      if (
        key.includes(`cat:${category}`) ||
        key.includes(`slug:${category}`) ||
        key.includes(`/${category}/`) ||
        key.includes(`:${category}:`)
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      console.log(`[PaginationCache] Deleted: ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.log(
        `[PaginationCache] Invalidated ${keysToDelete.length} entries for category: ${category}`
      );
    }
  }

  // Clear all entries for a specific author
  invalidateAuthor(authorId: string | number): void {
    if (!authorId) return;

    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.includes(`author:${authorId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      console.log(`[PaginationCache] Deleted: ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.log(
        `[PaginationCache] Invalidated ${keysToDelete.length} entries for author: ${authorId}`
      );
    }
  }

  // Clear all entries for a specific tag
  invalidateTag(tagId: string | number): void {
    if (!tagId) return;

    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.includes(`tag:${tagId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      console.log(`[PaginationCache] Deleted: ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.log(
        `[PaginationCache] Invalidated ${keysToDelete.length} entries for tag: ${tagId}`
      );
    }
  }

  // Clear all homepage-related pagination
  invalidateHomepage(): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      // Homepage-related endpoints
      if (
        key.includes("moreHomePosts") ||
        key.includes("home-posts") ||
        key.includes("homepage")
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      console.log(`[PaginationCache] Deleted: ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.log(
        `[PaginationCache] Invalidated ${keysToDelete.length} homepage entries`
      );
    }
  }

  // Clear all entries for a parent section and its children
  invalidateSection(section: string): void {
    if (!section) return;

    const keysToDelete: string[] = [];

    // Map of parent sections to their child categories
    const sectionChildren: Record<string, string[]> = {
      news: ["nation", "sabahsarawak"],
      berita: ["bahasa", "tempatan", "pandangan", "dunia"],
      business: ["local-business", "world-business"],
      lifestyle: [
        "leisure",
        "simple-stories",
        "travel",
        "food",
        "entertainment",
        "money",
        "health",
        "pets",
        "tech",
        "automotive",
        "property",
      ],
      opinion: ["column", "editorial", "letters", "fmt-worldviews"],
      world: ["south-east-asia"],
      sports: ["football", "badminton", "motorsports", "tennis"],
    };

    // Get children for this section
    const children = sectionChildren[section] || [];
    const allCategories = [section, ...children];

    for (const [key] of this.cache) {
      // Check if key contains any of the categories
      const shouldDelete = allCategories.some(
        (cat) =>
          key.includes(`cat:${cat}`) ||
          key.includes(`slug:${cat}`) ||
          key.includes(`/${cat}/`) ||
          key.includes(`:${cat}:`)
      );

      if (shouldDelete) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      console.log(`[PaginationCache] Deleted: ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.log(
        `[PaginationCache] Invalidated ${keysToDelete.length} entries for section: ${section}`
      );
    }
  }

  // Clear entire cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[PaginationCache] Cleared all ${size} entries`);
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
