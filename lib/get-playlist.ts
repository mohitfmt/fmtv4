export const getPlaylist = async (playlistId: string) => {
  try {
    const res = await fetch(
      `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/${playlistId}.json`,
      {
        next: { revalidate: 3600 }, // Optional: cache for 1 hour
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch playlist");
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return [];
  }
};

