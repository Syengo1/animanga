import type { MediaDetailDto } from "@/lib/api/types/media";

interface MediaInfoSidebarProps {
  media: MediaDetailDto;
}

export function MediaInfoSidebar({ media }: MediaInfoSidebarProps) {
  const accentColor = media.colorHex || "var(--primary)";

  return (
    <div className="flex flex-col gap-8">
      {/* Dynamic Type-Aware Information Block */}
      <section className="bg-accent border border-border rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-black tracking-widest uppercase text-foreground mb-6">
          Information
        </h3>
        <dl className="space-y-4 text-sm md:text-base">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-foreground/50 font-bold uppercase tracking-wide">
              Format
            </dt>
            <dd className="text-foreground font-medium text-right">
              {media.format?.replace(/_/g, " ") || "Unknown"}
            </dd>
          </div>

          {media.type === "ANIME" ? (
            <>
              {media.episodes && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-foreground/50 font-bold uppercase tracking-wide">
                    Episodes
                  </dt>
                  <dd className="text-foreground font-medium text-right">
                    {media.episodes}
                  </dd>
                </div>
              )}
              {media.duration && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-foreground/50 font-bold uppercase tracking-wide">
                    Duration
                  </dt>
                  <dd className="text-foreground font-medium text-right">
                    {media.duration} mins
                  </dd>
                </div>
              )}
            </>
          ) : (
            <>
              {media.chapters && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-foreground/50 font-bold uppercase tracking-wide">
                    Chapters
                  </dt>
                  <dd className="text-foreground font-medium text-right">
                    {media.chapters}
                  </dd>
                </div>
              )}
              {media.volumes && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-foreground/50 font-bold uppercase tracking-wide">
                    Volumes
                  </dt>
                  <dd className="text-foreground font-medium text-right">
                    {media.volumes}
                  </dd>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-foreground/50 font-bold uppercase tracking-wide">
              Status
            </dt>
            <dd className="text-foreground font-medium text-right">
              {media.status?.replace(/_/g, " ") || "Unknown"}
            </dd>
          </div>

          {/* FIX: Safely check for studios with optional chaining */}
          {media.studios?.length > 0 && (
            <div className="flex justify-between pt-2">
              <dt className="text-foreground/50 font-bold uppercase tracking-wide">
                Studios
              </dt>
              <dd
                className="font-bold text-right"
                style={{ color: accentColor }}
              >
                {media.studios
                  .filter((s) => s.isMain)
                  .map((s) => s.name)
                  .join(", ") || "Unknown"}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Authoritative Voice Language Detection */}
      {/* FIX: Safely check the nested properties using optional chaining */}
      {media.voiceLanguages?.languages?.length > 0 && (
        <section className="bg-accent border border-border rounded-2xl p-6 md:p-8">
          <h3 className="text-lg font-black tracking-widest uppercase text-foreground mb-6">
            Voice Languages
          </h3>
          <ul className="space-y-3">
            {media.voiceLanguages.languages.map((lang) => (
              <li
                key={lang.code}
                className="flex items-center justify-between text-sm md:text-base"
              >
                <span className="text-foreground font-medium">{lang.name}</span>
                <span className="text-[#34A853] font-bold">✓</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Discovery Tags */}
      {/* FIX: Safely check tags array */}
      {media.tags?.length > 0 && (
        <section>
          <h3 className="text-lg font-black tracking-widest uppercase text-foreground mb-4">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {media.tags
              .filter((tag) => !tag.isSpoiler)
              .slice(0, 10)
              .map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 bg-accent border border-border rounded-lg text-xs font-medium text-foreground/70 hover:text-foreground hover:border-white/30 transition-colors cursor-default"
                >
                  {tag.name}
                </span>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
