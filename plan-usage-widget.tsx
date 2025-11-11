import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export function PlanUsageWidget() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ["/api/plan-usage"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const isNearLimit = (percentage: number) => percentage >= 80;
  const isAtLimit = (percentage: number) => percentage >= 100;

  const productUsage = usage.usage.products;
  const orderUsage = usage.usage.orders;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Plano {usage.plan.name}
            </CardTitle>
            <CardDescription>Acompanhe seu uso mensal</CardDescription>
          </div>
          <Link href="/dashboard/subscription">
            <Button size="sm" variant="outline" data-testid="button-upgrade-plan">
              <TrendingUp className="h-4 w-4 mr-2" />
              Fazer Upgrade
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Produtos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Produtos</span>
            <span className="text-sm text-muted-foreground" data-testid="text-product-usage">
              {productUsage.current} / {productUsage.limit || "∞"}
            </span>
          </div>
          <Progress 
            value={productUsage.percentage} 
            className={
              isAtLimit(productUsage.percentage) ? "bg-red-200" :
              isNearLimit(productUsage.percentage) ? "bg-yellow-200" :
              "bg-muted"
            }
          />
          {isAtLimit(productUsage.percentage) && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Limite atingido! Faça upgrade para adicionar mais produtos.
            </p>
          )}
          {isNearLimit(productUsage.percentage) && !isAtLimit(productUsage.percentage) && (
            <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Você está próximo do limite de produtos.
            </p>
          )}
        </div>

        {/* Pedidos */}
        {orderUsage.limit && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Pedidos este mês</span>
              <span className="text-sm text-muted-foreground" data-testid="text-order-usage">
                {orderUsage.current} / {orderUsage.limit}
              </span>
            </div>
            <Progress 
              value={orderUsage.percentage}
              className={
                isAtLimit(orderUsage.percentage) ? "bg-red-200" :
                isNearLimit(orderUsage.percentage) ? "bg-yellow-200" :
                "bg-muted"
              }
            />
            {isAtLimit(orderUsage.percentage) && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Limite de pedidos atingido! Faça upgrade para processar mais.
              </p>
            )}
            {isNearLimit(orderUsage.percentage) && !isAtLimit(orderUsage.percentage) && (
              <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Você está próximo do limite de pedidos.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
