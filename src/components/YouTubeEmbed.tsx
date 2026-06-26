// Extrai o ID do YouTube de uma URL (youtu.be/ID, watch?v=ID, /embed/ID) ou
// devolve o próprio valor se já for um ID.
export function youtubeId(input: string | null): string | null {
  if (!input) return null;
  const v = input.trim();
  const m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(v)) return v;
  return null;
}

export default function YouTubeEmbed({ id }: { id: string }) {
  const vid = youtubeId(id) ?? id;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`}
        title="Vídeo do treino"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
