import type { NextApiRequest, NextApiResponse } from 'next';
import { gqlFetchAPI } from '@/lib/gql-queries/gql-fetch-api';
import { GET_SEARCH_POSTS } from '@/lib/gql-queries/get-search-posts';
import { SearchVariables } from '@/types/global';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { term, category, page = '0' } = req.query;
  const pageNum = parseInt(page as string);

  try {
    const queryVariables: SearchVariables = {
      where: {
        search: term as string,
        offsetPagination: {
          offset: 10 * pageNum,
          size: 10,
        }
      }
    };

    if (category && category !== 'all' && category !== '') {
      queryVariables.where.taxQuery = {
        relation: 'AND',
        taxArray: [
          {
            field: 'SLUG',
            operator: 'IN',
            taxonomy: 'CATEGORY',
            terms: (category as string).split(','),
          },
        ],
      };
    }

    const response = await gqlFetchAPI(GET_SEARCH_POSTS, {
      variables: queryVariables
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ message: 'Error fetching search results' });
  }
}