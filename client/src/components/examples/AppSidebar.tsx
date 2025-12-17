import { AppSidebar } from "../AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  return (
    <SidebarProvider>
      <div className="flex h-[400px] w-full">
        <AppSidebar />
        <div className="flex-1 p-4 bg-background">
          <p className="text-muted-foreground">메인 컨텐츠 영역</p>
        </div>
      </div>
    </SidebarProvider>
  );
}
