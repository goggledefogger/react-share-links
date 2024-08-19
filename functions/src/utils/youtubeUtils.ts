export function getYoutubeVideoId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export function isYoutubeUrl(url: string): boolean {
  // if the linkData.url is from either youtube.com or youtu.be, case insensitive
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/i;
  return youtubeRegex.test(url);
}
