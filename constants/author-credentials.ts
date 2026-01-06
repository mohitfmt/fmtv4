// constants/author-credentials.ts
/**
 * ════════════════════════════════════════════════════════════════════
 * FMT Author Credentials - Single Source of Truth
 * ════════════════════════════════════════════════════════════════════
 *
 * Complete author data combining:
 * ✅ WordPress (ID, slug, name, email, bio, post count)
 * ✅ teamMembers (job titles, LinkedIn, social profiles)
 * ✅ E-E-A-T signals (credentials, verified status)
 *
 * Generated: 2026-01-06
 * Total Authors: 240 (clean, active writers with @freemalaysiatoday.com)
 * With Credentials: 29 (matched with teamMembers)
 * With LinkedIn: 12
 * With Twitter: 1
 * Total Articles: 256,084
 *
 * Usage:
 * ```typescript
 * import { getAuthorCredentials } from '@/constants/author-credentials';
 *
 * const author = getAuthorCredentials('elill-easwaran');
 * // Returns: { name, jobTitle, sameAs: [LinkedIn], ... }
 * ```
 */

export interface AuthorCredentials {
  // WordPress Core Data
  id: number;
  slug: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  bio: string;
  avatarUrl: string;
  registeredDate: string;
  postCount: number;

  // teamMembers Rich Credentials (E-E-A-T)
  jobTitle: string | null;
  sameAs: string[];

  // Computed Signals
  matched: boolean;
  hasCredentials: boolean;
  hasLinkedIn: boolean;
  hasTwitter: boolean;
  hasFacebook: boolean;
  hasInstagram: boolean;
  socialProfileCount: number;
}

/**
 * ════════════════════════════════════════════════════════════════════
 * LOAD DATA FROM JSON FILE
 * ════════════════════════════════════════════════════════════════════
 *
 * Import the JSON data file (112 KB - optimized size)
 */
import authorCredentialsData from "./author-credentials.json";

export const authorCredentials: Record<string, AuthorCredentials> =
  authorCredentialsData as Record<string, AuthorCredentials>;

/**
 * ════════════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * Get author credentials by slug (PRIMARY KEY)
 * @param slug - WordPress author slug (e.g., 'elill-easwaran')
 * @returns AuthorCredentials or null if not found
 *
 * @example
 * const author = getAuthorCredentials('predeep-nambiar');
 * // Returns: { jobTitle: "Northern Bureau Chief", sameAs: [...], ... }
 */
export const getAuthorCredentials = (
  slug: string
): AuthorCredentials | null => {
  return authorCredentials[slug] || null;
};

/**
 * Get author credentials by ID
 * @param id - WordPress user ID
 * @returns AuthorCredentials or null if not found
 *
 * @example
 * const author = getAuthorCredentialsById(632);
 * // Returns Elill Easwaran's profile
 */
export const getAuthorCredentialsById = (
  id: number
): AuthorCredentials | null => {
  const author = Object.values(authorCredentials).find((a) => a.id === id);
  return author || null;
};

/**
 * Get author credentials by name
 * @param name - Author display name
 * @returns AuthorCredentials or null if not found
 *
 * @example
 * const author = getAuthorCredentialsByName('Predeep Nambiar');
 */
export const getAuthorCredentialsByName = (
  name: string
): AuthorCredentials | null => {
  const author = Object.values(authorCredentials).find(
    (a) => a.name.toLowerCase() === name.toLowerCase()
  );
  return author || null;
};

/**
 * Check if author has E-E-A-T credentials
 * @param slug - WordPress author slug
 * @returns boolean
 *
 * @example
 * if (hasEEATCredentials('elill-easwaran')) {
 *   // Show "Verified Journalist" badge
 * }
 */
export const hasEEATCredentials = (slug: string): boolean => {
  const author = getAuthorCredentials(slug);
  return author?.hasCredentials ?? false;
};

/**
 * Get authors with LinkedIn profiles (for SEO boost)
 * @returns Array of AuthorCredentials
 */
export const getAuthorsWithLinkedIn = (): AuthorCredentials[] => {
  return Object.values(authorCredentials).filter((a) => a.hasLinkedIn);
};

/**
 * Get authors with any social profile
 * @returns Array of AuthorCredentials
 */
export const getAuthorsWithSocialProfiles = (): AuthorCredentials[] => {
  return Object.values(authorCredentials).filter(
    (a) => a.socialProfileCount > 0
  );
};

/**
 * Get top authors by article count
 * @param limit - Number of authors to return
 * @returns Array of AuthorCredentials sorted by postCount
 */
export const getTopAuthorsByPostCount = (
  limit: number = 10
): AuthorCredentials[] => {
  return Object.values(authorCredentials)
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, limit);
};

/**
 * Get statistics about author credentials
 * @returns Statistics object
 *
 * @example
 * const stats = getAuthorStats();
 * console.log(`${stats.withCredentials} authors have E-E-A-T credentials`);
 */
export const getAuthorStats = () => {
  const all = Object.values(authorCredentials);
  const totalPosts = all.reduce((sum, a) => sum + a.postCount, 0);

  return {
    total: all.length,
    withCredentials: all.filter((a) => a.hasCredentials).length,
    withLinkedIn: all.filter((a) => a.hasLinkedIn).length,
    withTwitter: all.filter((a) => a.hasTwitter).length,
    withFacebook: all.filter((a) => a.hasFacebook).length,
    withInstagram: all.filter((a) => a.hasInstagram).length,
    withAnySocial: all.filter((a) => a.socialProfileCount > 0).length,
    totalArticles: totalPosts,
    averageArticlesPerAuthor: Math.round(totalPosts / all.length),
  };
};

/**
 * ════════════════════════════════════════════════════════════════════
 * EXAMPLE USAGE IN YOUR CODE
 * ════════════════════════════════════════════════════════════════════
 *
 * // In Article Page (pages/category/[...slug].tsx)
 * const authorSlug = post.author.node.slug;
 * const credentials = getAuthorCredentials(authorSlug);
 *
 * // Enhanced JSON-LD with E-E-A-T:
 * author: {
 *   "@type": "Person",
 *   name: credentials?.name || post.author.node.name,
 *   jobTitle: credentials?.jobTitle || "Journalist",
 *   sameAs: credentials?.sameAs || [],
 *   url: `${baseUrl}/category/author/${authorSlug}`,
 *   worksFor: {
 *     "@type": "NewsMediaOrganization",
 *     "@id": `${baseUrl}#organization`
 *   }
 * }
 *
 * // In Author Profile Page (pages/category/author/[...slug].tsx)
 * const credentials = getAuthorCredentials(author.slug);
 *
 * <div>
 *   <h1>{credentials.name}</h1>
 *   {credentials.jobTitle && <p>{credentials.jobTitle}</p>}
 *   {credentials.hasLinkedIn && (
 *     <a href={credentials.sameAs.find(url => url.includes('linkedin'))}>
 *       LinkedIn Profile
 *     </a>
 *   )}
 * </div>
 */
