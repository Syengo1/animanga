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

  // Generate windowed page numbers (e.g., 1 ... 4 5 6 ... 12)
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
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
    range.push(totalPages);
    return range;
  };

  return (
    <div className="flex items-center justify-center gap-1 md:gap-2 mt-12 mb-8">
      {/* First Page */}
      {currentPage === 1 ? (
        <Button variant="ghost" size="icon" disabled>
          <ChevronsLeft className="w-4 h-4" />
        </Button>
      ) : (
        <Link
          href={createPageUrl(1)}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Link>
      )}

      {/* Previous Page */}
      {currentPage === 1 ? (
        <Button variant="ghost" size="icon" disabled>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      ) : (
        <Link
          href={createPageUrl(currentPage - 1)}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1 mx-2">
        {getVisiblePages().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-foreground/40">
              ...
            </span>
          ) : currentPage === page ? (
            <Button key={`page-${page}`} variant="default" className="w-9 h-9">
              {page}
            </Button>
          ) : (
            <Link
              key={`page-${page}`}
              href={createPageUrl(page as number)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-9 h-9 text-foreground/70 hover:text-foreground",
              )}
            >
              {page}
            </Link>
          ),
        )}
      </div>

      {/* Next Page */}
      {currentPage === totalPages ? (
        <Button variant="ghost" size="icon" disabled>
          <ChevronRight className="w-4 h-4" />
        </Button>
      ) : (
        <Link
          href={createPageUrl(currentPage + 1)}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}

      {/* Last Page */}
      {currentPage === totalPages ? (
        <Button variant="ghost" size="icon" disabled>
          <ChevronsRight className="w-4 h-4" />
        </Button>
      ) : (
        <Link
          href={createPageUrl(totalPages)}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
