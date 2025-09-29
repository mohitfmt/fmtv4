export const newsYouTubePlaylistId = "PLKe9JQ8opkEAErOOqs4tB87iWhuh_-osl";
export const carzillaYouTubePlaylistId = "PLKe9JQ8opkEBA3B18pmiK2B5nE95A74qI";
export const specialReportYouTubePlaylistId =
  "PLKe9JQ8opkED1GXiSi3Q6kPc5ttqISipf";
export const lifestyleYouTubePlaylistId = "PLKe9JQ8opkECd7X7RJ6WjKEW9TX39kERS";
export const exclusiveYouTubePlaylistId = "PLKe9JQ8opkECLh07v3VLtdPDaD4PJ_VqB";
export const businessYouTubePlaylistId = "PLKe9JQ8opkECFhIRt6ARjHweZoDAdWxv-";
export const festivalsYouTubePlaylistId = "PLKe9JQ8opkEAarF66np42wSzeKNZTEi03";
export const whatskickinYouTubePlaylistId =
  "PLKe9JQ8opkEC5v84Dg-zJB57Noas-XLYG";
export const prnke15YouTubePlaylistId = "PLKe9JQ8opkEA01GjEOG3KaA8YTecWHY-w";

export const youTubePlaylists = [
  {
    id: "fmt-news-tab",
    target: "fmt-news-list",
    name: "FMT NEWS",
    playlistId: newsYouTubePlaylistId,
  },
  {
    id: "fmt-lifestyle-tab",
    target: "fmt-lifestyle-list",
    name: "FMT LIFESTYLE",
    playlistId: lifestyleYouTubePlaylistId,
  },
  {
    id: "fmt-special-report-tab",
    target: "fmt-special-report-list",
    name: "FMT SPECIAL REPORT",
    playlistId: specialReportYouTubePlaylistId,
  },
  {
    id: "fmt-exclusive-tab",
    target: "fmt-exclusive-list",
    name: "FMT EXCLUSIVE",
    playlistId: exclusiveYouTubePlaylistId,
  },
  {
    id: "fmt-business-tab",
    target: "fmt-business-list",
    name: "FMT BUSINESS",
    playlistId: businessYouTubePlaylistId,
  },
  {
    id: "fmt-carzilla-tab",
    target: "fmt-carzilla-list",
    name: "FMT CARZILLA",
    playlistId: carzillaYouTubePlaylistId,
  },
];

// constants/youtube-playlists.ts
// YouTube Playlist IDs - Static configuration
// Avoids ENV variables and deployment complexity

export const YOUTUBE_PLAYLISTS = {
  // Main playlists for video gallery
  HERO: "PLLeykLlB1BfCm3g0i7Mhphm9RMDl-SZkV", // Featured/Hero content
  SHORTS: "PLLeykLlB1BfCm3g0i7Mhphm9RMDl-SZkV", // Shorts/Reels

  // Category playlists
  NEWS: "PLLeykLlB1BfDvCG6iP-fphF5h9QB5jD-H",
  INTERVIEWS: "PLLeykLlB1BfBzwik5W3rv7uhcP88vxqf9",
  SPECIAL_REPORTS: "PLLeykLlB1BfAu-P8ubWp8GmApWCBvvLOt",
  BUSINESS: "PLLeykLlB1BfCBVnCAqOJ7b7kH0Os7qcfZ",
  POLITICS: "PLLeykLlB1BfDG_0vyaJSy2r9gdQOQ_h6F",
  SPORTS: "PLLeykLlB1BfA5fpOkPgpNb95vPpPsoSGH",

  // Critical playlists (monitored more frequently)
  CRITICAL: [
    "PLLeykLlB1BfDvCG6iP-fphF5h9QB5jD-H", // News
    "PLLeykLlB1BfBzwik5W3rv7uhcP88vxqf9", // Interviews
  ],

  // Default playlist configurations for gallery
  DEFAULT_GALLERY_CONFIG: [
    {
      playlistId: "PLLeykLlB1BfDvCG6iP-fphF5h9QB5jD-H",
      position: 1,
      enabled: true,
      maxVideos: 12,
      title: "Latest News",
    },
    {
      playlistId: "PLLeykLlB1BfBzwik5W3rv7uhcP88vxqf9",
      position: 2,
      enabled: true,
      maxVideos: 12,
      title: "Interviews",
    },
    {
      playlistId: "PLLeykLlB1BfAu-P8ubWp8GmApWCBvvLOt",
      position: 3,
      enabled: true,
      maxVideos: 12,
      title: "Special Reports",
    },
  ] as const,
};

// Helper to get playlist config
export function getPlaylistConfig(playlistId: string) {
  return YOUTUBE_PLAYLISTS.DEFAULT_GALLERY_CONFIG.find(
    (config) => config.playlistId === playlistId
  );
}

// Check if playlist is critical
export function isCriticalPlaylist(playlistId: string): boolean {
  return YOUTUBE_PLAYLISTS.CRITICAL.includes(playlistId);
}
