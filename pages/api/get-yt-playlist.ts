// pages/api/yt-playlist.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { playlistId } = req.body

  if (!playlistId) {
    return res.status(400).json({ message: 'Playlist ID is required' })
  }

  try {
    const response = await fetch(
      `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/${playlistId}.json`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching playlist:', error)
    res.status(500).json({ message: 'Failed to fetch playlist' })
  }
}