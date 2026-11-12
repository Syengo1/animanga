// C:\Projects\animanga-platform\apps\web\src\features\media\media-info-sidebar.tsx
import { Check, ExternalLink } from "lucide-react";
import type { MediaDetailDto } from "@/lib/api/types/media";

interface MediaInfoSidebarProps {
  media: MediaDetailDto;
}

export function MediaInfoSidebar({ media }: MediaInfoSidebarProps) {
  const accentColor = media.colorHex || "var(--primary)";

  return (
    <aside className="flex flex-col gap-6">
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
        <h3 className="text-sm font-black tracking-widest uppercase text-foreground mb-4">
          Information
        </h3>
        <dl className="space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground font-bold uppercase tracking-wide">
              Format
            </dt>
            <dd className="text-foreground font-semibold text-right">
              {media.format?.replace(/_/g, " ") || "Unknown"}
            </dd>
          </div>

          {media.type === "ANIME" ? (
            <>
              {media.episodes && (
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide">
                    Episodes
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.episodes}
                  </dd>
                </div>
              )}
              {media.duration && (
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide">
                    Duration
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.duration} mins
                  </dd>
                </div>
              )}
            </>
          ) : (
            <>
              {media.chapters && (
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide">
                    Chapters
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.chapters}
                  </dd>
                </div>
              )}
              {media.volumes && (
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground font-bold uppercase tracking-wide">
                    Volumes
                  </dt>
                  <dd className="text-foreground font-semibold text-right">
                    {media.volumes}
                  </dd>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground font-bold uppercase tracking-wide">
              Status
            </dt>
            <dd className="text-foreground font-semibold text-right">
              {media.status?.replace(/_/g, " ") || "Unknown"}
            </dd>
          </div>

          {media.seasonYear && (
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide">
                Season
              </dt>
              <dd className="text-foreground font-semibold text-right">
                {media.season ? `${media.season} ` : ""}
                {media.seasonYear}
              </dd>
            </div>
          )}

          {media.studios?.length > 0 && (
            <div className="flex justify-between pt-1">
              <dt className="text-muted-foreground font-bold uppercase tracking-wide">
                Studios
              </dt>
              <dd
                className="font-bold text-right"
                style={{ color: accentColor }}
              >
                {media.studios
                  .filter((s) => s.isMain)
                  .map((s) => s.name)
                  .join(", ") ||
                  media.studios[0]?.name ||
                  "Unknown"}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {media.voiceLanguages?.languages?.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase text-foreground mb-4">
            Audio & Dubs
          </h3>
          <ul className="space-y-2.5">
            {media.voiceLanguages.languages.map((lang) => (
              <li
                key={lang.code}
                className="flex items-center justify-between text-xs sm:text-sm"
              >
                <span className="text-foreground font-semibold">
                  {lang.name}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Check className="w-3.5 h-3.5" /> Available
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {media.externalLinks?.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase text-foreground mb-4">
            Official Links
          </h3>
          <div className="flex flex-wrap gap-2">
            {media.externalLinks.slice(0, 8).map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-xs font-bold text-foreground border border-border transition-colors"
              >
                <span>{link.site}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        </section>
      )}

      {media.tags?.length > 0 && (
        <section>
          <h3 className="text-sm font-black tracking-widest uppercase text-foreground mb-3">
            Themes & Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {media.tags
              .filter((tag) => !tag.isSpoiler)
              .slice(0, 12)
              .map((tag) => (
                <span
                  key={tag.id}
                  className="px-2.5 py-1 bg-card border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {tag.name}
                </span>
              ))}
          </div>
        </section>
      )}
    </aside>
  );
}
