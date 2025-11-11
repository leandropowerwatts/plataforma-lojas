import { Home, Package, ShoppingCart, Palette, Settings, BarChart3, Tag, Star, LogOut, CreditCard, Truck, Store } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import type { Store as StoreType } from "@shared/schema";

const baseMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Minhas Lojas",
    url: "/dashboard/stores",
    icon: Store,
  },
  {
    title: "Produtos",
    url: "/dashboard/products",
    icon: Package,
  },
  {
    title: "Pedidos",
    url: "/dashboard/orders",
    icon: ShoppingCart,
  },
  {
    title: "Categorias",
    url: "/dashboard/categories",
    icon: Tag,
  },
  {
    title: "Cupons",
    url: "/dashboard/coupons",
    icon: Tag,
  },
  {
    title: "Frete",
    url: "/dashboard/shipping",
    icon: Truck,
  },
  {
    title: "Avaliações",
    url: "/dashboard/reviews",
    icon: Star,
  },
  {
    title: "Assinatura",
    url: "/dashboard/subscription",
    icon: CreditCard,
  },
  {
    title: "Configurações",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: stores } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });

  const customizationUrl = stores && stores.length === 1
    ? `/dashboard/customization/${stores[0].id}`
    : "/dashboard/stores";

  const menuItems = [
    ...baseMenuItems.slice(0, 8),
    {
      title: "Personalização",
      url: customizationUrl,
      icon: Palette,
    },
    ...baseMenuItems.slice(8),
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">Minha Loja</h2>
            <p className="text-xs text-muted-foreground truncate">Painel Administrativo</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName || user?.email?.split("@")[0] || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <SidebarMenuButton asChild data-testid="button-logout">
          <a href="/api/logout" className="w-full">
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </a>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
