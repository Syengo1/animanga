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
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground py-6 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <CustomerWorkspaceNav />
          <div className="flex-1 w-full min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
