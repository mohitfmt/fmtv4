'use client'

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import HeadlineSkeleton from "@/components/skeletons/HeadlineSkeleton"
import { GET_HEADLINES } from "@/lib/gql-queries/get-headlines"

const API_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
  "https://cms.freemalaysiatoday.com/graphql"

type Post = {
  id?: string
  title: string
  uri: string
  categoryName: string
}

// Category mapping in a constant
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "super-highlight": "breaking news",
  "top-news": "just in",
  "top-bm": "berita",
  "leisure": "Lifestyle",
  "sports": "Sports",
  "opinion": "Opinion",
  "business": "Business",
  "world": "World",
  "video": "Video",
}

const Headlines = () => {
  const [isHovering, setIsHovering] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const categories = [
    "super-highlight",
    "top-news",
    "business",
    "opinion",
    "world",
    "leisure",
    "sports",
    "top-bm",
    "video",
  ]

  const fetchCategoryPosts = async (category: string) => {
    try {
      // console.log(`Fetching posts for category: ${category}`)

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: GET_HEADLINES,
          variables: {
            categoryName: category,
          },
        }),
      })

      if (!response.ok) {
        console.error(
          `HTTP error for ${category}:`,
          response.status,
          response.statusText
        )
        throw new Error(`Failed to fetch ${category} headlines`)
      }

      const responseData = await response.json()
   

      // Check if there are any posts
      if (responseData.data?.posts?.edges?.length > 0) {
        const post = responseData.data.posts.edges[0].node
        return {
          title: post.title,
          uri: post.uri,
          categoryName: category,
        }
      }

      // console.log(`No posts found for category: ${category}`)
      return null
    } catch (err) {
      console.error(`Complete error fetching ${category} posts:`, err)
      return null
    }
  }

  const fetchPosts = async () => {
    try {
      setIsLoading(true)

      // Process all categories
      const results = await Promise.all(
        categories.map((category) => fetchCategoryPosts(category))
      )

      // Filter out null results
      const filteredResults = results.filter(Boolean) as Post[]

      // console.log("Final filtered results:", filteredResults)

      setPosts(filteredResults)
      setIsLoading(false)
    } catch (err) {
      console.error("Failed to load headlines:", err)
      setError(
        err instanceof Error ? err : new Error("Failed to load headlines")
      )
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchPosts()
  }, [])

  // Memoized category name function
  const getCategoryDisplayName = useCallback((catName: string): string => {
    return CATEGORY_DISPLAY_NAMES[catName.toLowerCase()] || catName
  }, [])

  // Error handling with retry
  if (error) {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        <HeadlineSkeleton />
        <button
          onClick={() => {
            setError(null)
            fetchPosts()
          }}
          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center gap-2 overflow-hidden">
      <h3 className="uppercase text-sm sm:text-base sm:leading-none font-rhd flex flex-col items-end leading-none shrink-0">
        <span className="tracking-widest">Latest</span>
        <span className="font-semibold">Headlines</span>
      </h3>

      <div className="relative flex items-center overflow-x-hidden">
        <div
          className="animate-marquee whitespace-nowrap"
          style={{
            willChange: "transform",
            animation: posts?.length
              ? `marquee 60s linear infinite ${
                  isHovering ? "paused" : "running"
                }`
              : "none",
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {isLoading ? (
            <HeadlineSkeleton />
          ) : (
            posts?.map((post, index) => (
              <Link
                key={`${post.categoryName}-${index}`}
                className="mx-1 inline-flex items-center group"
                href={post.uri}
                prefetch={false}
              >
                <span className="uppercase py-0.5 px-2 bg-accent-yellow text-sm tracking-wide font-semibold mr-2 rounded-lg">
                  <span className="flex items-center text-black">
                    {getCategoryDisplayName(post.categoryName)}
                    <ArrowRightIcon className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
                <span className="group-hover:text-cyan-300 transition-colors">
                  {post.title}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Headlines