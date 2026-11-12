// C:\Projects\animanga-platform\apps\web\src\components\shared\pagination.tsx
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  createPageUrl: (page: number) => string;
}

export function Pagination({
  currentPage,
  totalPages,
  createPageUrl,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range: Array<number | "..."> = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");

    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  return (
    <nav
      aria-label="Catalog pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 mb-6 pt-6 border-t border-border"
    >
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Page <span className="text-foreground">{currentPage}</span> of{" "}
        <span className="text-foreground">{totalPages}</span>
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {/* First Page */}
        {currentPage === 1 ? (
          <Button
            variant="outline"
            size="icon"
            disabled
            aria-label="First page"
            className="h-9 w-9 rounded-xl"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
        ) : (
          <Link
            href={createPageUrl(1)}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "h-9 w-9 rounded-xl bg-card hover:bg-accent",
            )}
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Link>
        )}

        {/* Previous Page Button */}
        {currentPage === 1 ? (
          <Button
            variant="outline"
            disabled
            className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>
        ) : (
          <Link
            href={createPageUrl(currentPage - 1)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 px-3.5 rounded-xl font-bold text-xs gap-1 bg-card hover:bg-accent",
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Link>
        )}

        {/* Windowed Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getVisiblePages().map((page, idx) =>
            page === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-muted-foreground font-bold text-xs"
              >
                ...
              </span>
            ) : currentPage === page ? (
              <Button
                key={`page-${page}`}
                variant="default"
                aria-current="page"
                className="w-9 h-9 rounded-xl font-black text-xs shadow-sm"
              >
                {page}
              </Button>
            ) : (
              <Link
                key={`page-${page}`}
                href={createPageUrl(page)}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-9 h-9 rounded-xl font-bold text-xs text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {page}
              </Link>
            ),
          )}
        </div>

        {/* Prominent Next Page Button */}
        {currentPage === totalPages ? (
          <Button
            variant="default"
            disabled
            className="h-9 px-4 rounded-xl font-bold text-xs gap-1"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Link
            href={createPageUrl(currentPage + 1)}
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-9 px-4 rounded-xl font-bold text-xs gap-1 shadow-sm",
            )}
            aria-label="Next page"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}

        {/* Last Page */}
        {currentPage === totalPages ? (
          <Button
            variant="outline"
            size="icon"
            disabled
            aria-label="Last page"
            className="h-9 w-9 rounded-xl"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        ) : (
          <Link
            href={createPageUrl(totalPages)}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "h-9 w-9 rounded-xl bg-card hover:bg-accent",
            )}
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
