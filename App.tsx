import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Orders from "@/pages/orders";
import AdminCategories from "@/pages/admin-categories";
import Coupons from "@/pages/customization";
import StoreCustomization from "@/pages/store-customization";
import Settings from "@/pages/settings";
import Reviews from "@/pages/reviews";
import Shipping from "@/pages/shipping";
import Storefront from "@/pages/categories";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import OrderConfirmation from "@/pages/order-confirmation";
import PaymentSuccess from "@/pages/payment-success";
import Subscription from "@/pages/subscription";
import DebugPlans from "@/pages/debug-plans";
import SimpleLogin from "@/pages/simple-login";
import StoresManagement from "@/pages/stores";
import SetupPlans from "@/pages/setup-plans";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Acesso não autorizado",
        description: "Você precisa estar logado para acessar esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={SimpleLogin} />
      <Route path="/setup-plans" component={SetupPlans} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard/stores" component={() => <ProtectedRoute component={StoresManagement} />} />
      <Route path="/dashboard/products" component={() => <ProtectedRoute component={Products} />} />
      <Route path="/dashboard/orders" component={() => <ProtectedRoute component={Orders} />} />
      <Route path="/dashboard/categories" component={() => <ProtectedRoute component={AdminCategories} />} />
      <Route path="/dashboard/coupons" component={() => <ProtectedRoute component={Coupons} />} />
      <Route path="/dashboard/reviews" component={() => <ProtectedRoute component={Reviews} />} />
      <Route path="/dashboard/shipping" component={() => <ProtectedRoute component={Shipping} />} />
      <Route path="/dashboard/customization/:storeId" component={() => <ProtectedRoute component={StoreCustomization} />} />
      <Route path="/dashboard/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/dashboard/subscription" component={() => <ProtectedRoute component={Subscription} />} />
      <Route path="/debug/plans" component={() => <ProtectedRoute component={DebugPlans} />} />
      <Route path="/store/:slug" component={Storefront} />
      <Route path="/cart/:slug?" component={Cart} />
      <Route path="/checkout/:slug" component={Checkout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/order-confirmation/:slug" component={OrderConfirmation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading || !isAuthenticated) {
    return (
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-3 border-b bg-background">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-y-auto">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
