export function toSpotifyEmbed(url: string): string {
  const match = url.match(/open\.spotify\.com\/(playlist|track|album|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (!match) return "";
  const [, type, id] = match;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}