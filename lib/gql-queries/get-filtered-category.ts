// Interfaces for the data structure
export interface Author {
  uri: string;
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: {
    url: string;
  };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface FeaturedImage {
  sourceUrl: string;
  mediaItemUrl: string;
}

export interface Post {
  id: string;
  databaseId: number;
  date: string;
  slug: string;
  title: string;
  uri: string;
  author: {
    node: Author;
  };
  categories: {
    edges: Array<{
      node: Category;
    }>;
  };
  tags: {
    edges: Array<{
      node: Tag;
    }>;
  };
  excerpt: string;
  featuredImage: {
    node: FeaturedImage;
  };
}

export interface PostsResponse {
  posts: {
    edges: Array<{
      node: Post;
    }>;
  };
}

export interface TaxQuery {
  taxArray: Array<{
    terms: string[];
    operator: string;
    taxonomy: string;
    field: string;
  }>;
  relation: string;
}

export interface PostsVariables {
  first: number;
  where?: {
    taxQuery?: TaxQuery;
    status?: string;
    [key: string]: any;
  };
}

export const GET_FILTERED_CATEGORY = `
  query GetPosts(
    $first: Int
    $where: RootQueryToPostConnectionWhereArgs
  ) {
    posts(
      first: $first
      where: $where
    ) {
      edges {
        node {
          id
          title
          excerpt
          uri
          date
          dateGmt
          slug
          databaseId
          categories {
            edges {
              node {
                slug
                name
              }
            }
          }
          author {
            node {
              uri
              name
              avatar
              {
                url
              }
            }
          }
          tags {
            edges {
              node {
                id
                name
                slug
                count
                description
              }
            }
          }
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    }
  }
`;
