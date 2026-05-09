import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Laptop
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const NAV_ITEMS = [
  { title: "대시보드", url: "/", icon: LayoutDashboard, exact: true },
  { title: "사업장 관리", url: "/businesses", icon: Building2 },
  { title: "근로자 관리", url: "/workers", icon: Users },
  { title: "지원금 회차", url: "/rounds", icon: Briefcase },
  { title: "알림", url: "/notifications", icon: Bell },
];

const ADMIN_ITEMS = [
  { title: "사용자 관리", url: "/admin/users", icon: Settings },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout: clearAuth } = useAuth();
  const [location] = useLocation();
  const { setTheme } = useTheme();
  const logoutMutation = useLogout();
  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        clearAuth();
      }
    });
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
              <Building2 className="w-6 h-6 text-primary" />
              <span>청년도약장려금</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>메뉴</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => {
                    const isActive = item.exact ? location === item.url : location.startsWith(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.url} data-testid={`nav-${item.url.substring(1) || 'dashboard'}`}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            {user?.role === "admin" && (
              <SidebarGroup>
                <SidebarGroupLabel>관리자</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {ADMIN_ITEMS.map((item) => {
                      const isActive = location.startsWith(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.url} data-testid={`nav-admin-users`}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
          <SidebarFooter className="p-4 flex-col gap-2">
            <div className="text-sm px-2 py-1 text-muted-foreground truncate">
              {user?.name} ({user?.role})
            </div>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout} data-testid="btn-logout">
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 bg-card">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="btn-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="btn-theme-toggle">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="w-4 h-4 mr-2" /> 라이트 모드
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="w-4 h-4 mr-2" /> 다크 모드
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Laptop className="w-4 h-4 mr-2" /> 시스템
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}