import { MediaCard } from "@/components/shared/media-card";

interface MediaRelationsProps {
  relations: any[];
  accentColor: string;
}

export function MediaRelations({
  relations,
  accentColor,
}: MediaRelationsProps) {
  if (!relations || relations.length === 0) return null;

  // Filter out noisy/irrelevant relation types if necessary
  const relevantRelations = relations.filter(
    (rel) => !["CHARACTER", "OTHER"].includes(rel.relationType),
  );

  if (relevantRelations.length === 0) return null;

  return (
    <section>
      <h3 className="text-2xl font-black tracking-tight uppercase text-foreground mb-6 flex items-center gap-3">
        <span
          className="w-2 h-8 bg-primary rounded-sm"
          style={{ backgroundColor: accentColor }}
        />
        Franchise & Relations
      </h3>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-6">
        {relevantRelations.map((rel, idx) => (
          <div key={`${rel.media.id}-${idx}`} className="flex flex-col gap-2">
            <span
              className="text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded bg-accent border border-border w-fit"
              style={{ color: accentColor }}
            >
              {rel.relationType.replace(/_/g, " ")}
            </span>
            <MediaCard media={rel.media} />
          </div>
        ))}
      </div>
    </section>
  );
}
