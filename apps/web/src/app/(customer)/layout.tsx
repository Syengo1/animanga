// C:\Projects\animanga-platform\apps\web\src\app\(customer)\layout.tsx
import { requireSession } from "@/lib/auth/session";
import { CustomerWorkspaceNav } from "@/components/layout/customer-workspace-nav";

export default async function CustomerWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full max-w-full overflow-x-clip bg-background text-foreground py-5 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 items-stretch lg:items-start w-full min-w-0">
          <CustomerWorkspaceNav />
          <div className="flex-1 w-full max-w-full min-w-0 overflow-x-clip">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
