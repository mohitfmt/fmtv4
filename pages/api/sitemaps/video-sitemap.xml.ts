import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/fmt-yt.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching JSON data: ${response.statusText}`);
    }
    const videosJson = await response.json();

    // Fetch additional details for each playlist
    const detailedVideos = await fetchAdditionalDetails(videosJson);

    const sitemap = generateVideoSitemap(detailedVideos);

    res.setHeader('Content-Type', 'application/xml');
    res.write(sitemap);
    res.end();
  } catch (error) {
    console.error('Sitemap fetching error:', error);
    res.status(500).send('Internal Server Error: Sitemap fetching error');
  }
}

const fetchAdditionalDetails = async (videos: any) => {
  const detailedVideos = await Promise.all(
    videos.flat().map(async (videoObj: any) => {
      const video = videoObj.node;
      const playlistId = video.uri.match(/playlistId=([^&]+)/)?.[1];

      if (playlistId) {
        const playlistUrl = `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/${playlistId}.json`;
        try {
          const playlistResponse = await fetch(playlistUrl);
          if (!playlistResponse.ok) {
            throw new Error(
              `Error fetching playlist JSON data: ${playlistResponse.statusText}`,
            );
          }
          const playlistJson = await playlistResponse.json();
          const detailedVideo = playlistJson.find(
            (v: any) => v.node.videoId === video.videoId,
          );
          return detailedVideo
            ? { ...videoObj, node: { ...video, ...detailedVideo.node } }
            : videoObj;
        } catch (error) {
          console.error(
            `Error fetching details for playlist ${playlistId}:`,
            error,
          );
          return videoObj;
        }
      }
      return videoObj;
    }),
  );

  return detailedVideos;
};

const generateVideoSitemap = (videos: any) => {
  const videoEntries = videos
    .map((videoObj: any) => {
      const video = videoObj.node;
      return `
      <url>
        <loc>https://www.freemalaysiatoday.com${video?.uri}</loc>
        <video:video>
          <video:thumbnail_loc>${video?.featuredImage?.node?.mediaItemUrl}</video:thumbnail_loc>
          <video:title><![CDATA[${video?.title}]]></video:title>
          <video:description><![CDATA[${video?.excerpt.split(' ').slice(0, 30).join(' ') + '...'}]]></video:description>
          <video:player_loc>https://www.youtube.com/embed/${video?.videoId}</video:player_loc>
          <video:publication_date>${video?.dateGmt}</video:publication_date>
          ${video?.categories?.nodes?.map((cat: any) => `<video:category><![CDATA[${cat?.name}]]></video:category>`).join('')}
          ${video?.tags ? video?.tags?.map((tag: any) => `<video:tag><![CDATA[${tag}]]></video:tag>`).join('') : ''}
          ${video?.duration ? `<video:duration>${parseISO8601Duration(video?.duration)}</video:duration>` : ''}
          ${video?.statistics?.viewCount ? `<video:view_count>${video?.statistics?.viewCount}</video:view_count>` : ''}
        </video:video>
      </url>
    `;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
      ${videoEntries}
    </urlset>`;
};

const parseISO8601Duration = (duration: any) => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
};