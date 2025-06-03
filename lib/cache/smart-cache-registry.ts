/**
 * Central registry of all smart caches
 * This replaces your individual cache declarations
 */

import {
  SmartNewsCache,
  ContentChangeManager,
} from "./news-portal-cache-system";

// Initialize the content change manager
export const changeManager = new ContentChangeManager(100);

// Create all your caches as smart caches
export const caches = {
  // Post-related caches
  postData: new SmartNewsCache<any>("postData", {
    max: 300,
    maxSize: 150 * 1024 * 1024, // 150MB
    ttl: 1000 * 60 * 5, // 5 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // Category and filtered posts cache
  filteredCategory: new SmartNewsCache<any>("filteredCategory", {
    max: 300,
    maxSize: 100 * 1024 * 1024, // 100MB
    ttl: 1000 * 60 * 3, // 3 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // Homepage and highlights
  moreHomePosts: new SmartNewsCache<any>("moreHomePosts", {
    max: 500,
    maxSize: 50 * 1024 * 1024, // 50MB
    ttl: 1000 * 60, // 1 minute
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // NEW: Pagination caches for different endpoints
  moreHorizontalPosts: new SmartNewsCache<any>("moreHorizontalPosts", {
    max: 200,
    maxSize: 30 * 1024 * 1024, // 30MB
    ttl: 1000 * 60, // 1 minute
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  moreVerticalPosts: new SmartNewsCache<any>("moreVerticalPosts", {
    max: 200,
    maxSize: 40 * 1024 * 1024, // 40MB
    ttl: 1000 * 60, // 1 minute
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  moreSubcategoryPosts: new SmartNewsCache<any>("moreSubcategoryPosts", {
    max: 300,
    maxSize: 40 * 1024 * 1024, // 40MB
    ttl: 1000 * 60, // 1 minute
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  moreAuthorPosts: new SmartNewsCache<any>("moreAuthorPosts", {
    max: 150,
    maxSize: 20 * 1024 * 1024, // 20MB
    ttl: 1000 * 60 * 2, // 2 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  moreTagPosts: new SmartNewsCache<any>("moreTagPosts", {
    max: 150,
    maxSize: 20 * 1024 * 1024, // 20MB
    ttl: 1000 * 60 * 2, // 2 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  morePhotos: new SmartNewsCache<any>("morePhotos", {
    max: 100,
    maxSize: 30 * 1024 * 1024, // 30MB
    ttl: 1000 * 60 * 5, // 5 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // Author cache
  author: new SmartNewsCache<any>("author", {
    max: 200,
    maxSize: 20 * 1024 * 1024, // 20MB
    ttl: 1000 * 60 * 5, // 5 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // Category news cache
  category: new SmartNewsCache<any>("category", {
    max: 500,
    maxSize: 50 * 1024 * 1024, // 50MB
    ttl: 1000 * 30, // 30 seconds
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // Headline news cache
  headlineNews: new SmartNewsCache<any>("headlineNews", {
    max: 100,
    maxSize: 20 * 1024 * 1024, // 20MB
    ttl: 1000 * 60, // 1 minute
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // Post page cache (includes related posts)
  postPage: new SmartNewsCache<any>("postPage", {
    max: 500,
    maxSize: 100 * 1024 * 1024, // 100MB
    ttl: 1000 * 60 * 3, // 3 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  // Smaller caches
  allPostSlugs: new SmartNewsCache<any>("allPostSlugs", {
    max: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    ttl: 1000 * 60, // 1 minute
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  tag: new SmartNewsCache<any>("tag", {
    max: 100,
    maxSize: 10 * 1024 * 1024, // 10MB
    ttl: 1000 * 60 * 60, // 1 hour
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  columnist: new SmartNewsCache<any>("columnist", {
    max: 50,
    maxSize: 10 * 1024 * 1024, // 10MB
    ttl: 1000 * 60 * 10, // 10 minutes
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),

  sidebarContent: new SmartNewsCache<any>("sidebarContent", {
    max: 20, // Small max since there aren't many variations
    maxSize: 10 * 1024 * 1024, // 10MB is plenty for sidebar data
    ttl: 1000 * 60 * 10, // 10 minutes - longer TTL since content is stable
    sizeCalculation: (value) => JSON.stringify(value).length * 2,
  }),
};

// Register all caches with the change manager
Object.entries(caches).forEach(([name, cache]) => {
  changeManager.registerCache(name, cache);
});

// Export individual caches for backward compatibility
export const postDataCache = caches.postData;
export const filteredCategoryCache = caches.filteredCategory;
export const moreHomePostsCache = caches.moreHomePosts;
export const authorCache = caches.author;
export const categoryCache = caches.category;
export const headlineNewsCache = caches.headlineNews;
export const postPageCache = caches.postPage;
export const allPostSlugsCache = caches.allPostSlugs;
export const tagCache = caches.tag;
export const columnistCache = caches.columnist;

// NEW: Export pagination caches
export const moreHorizontalPostsCache = caches.moreHorizontalPosts;
export const moreVerticalPostsCache = caches.moreVerticalPosts;
export const moreSubcategoryPostsCache = caches.moreSubcategoryPosts;
export const moreAuthorPostsCache = caches.moreAuthorPosts;
export const moreTagPostsCache = caches.moreTagPosts;
export const morePhotosCache = caches.morePhotos;
export const sidebarContentCache = caches.sidebarContent;
