import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Rocket, X, Bug } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: string;
  features: string[];
  maxProducts: number | null;
  maxOrders: number | null;
}

interface Subscription {
  plan: Plan;
  status: string;
  isFree?: boolean;
}

export default function Subscription() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: plans, isLoading: plansLoading, error: plansError, dataUpdatedAt, isFetching } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: currentSubscription, error: subError } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    retry: 2,
  });

  console.log("📊 Subscription Page Debug:", { 
    plansCount: plans?.length, 
    plansArray: Array.isArray(plans),
    plans,
    currentSubscription,
    plansLoading,
    isFetching,
    dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
    plansError: plansError ? String(plansError) : null,
    subError: subError ? String(subError) : null,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout", { planId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        toast({
          title: "Sucesso!",
          description: "Plano gratuito ativado com sucesso!",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada com sucesso.",
      });
    },
  });

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case "gratis": return <Zap className="h-6 w-6" />;
      case "basico": return <Check className="h-6 w-6" />;
      case "profissional": return <Crown className="h-6 w-6" />;
      case "enterprise": return <Rocket className="h-6 w-6" />;
      default: return <Check className="h-6 w-6" />;
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan?.id === planId;
  };

  if (plansLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground">Carregando planos...</p>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-destructive font-medium">Erro ao carregar planos</p>
        <p className="text-sm text-muted-foreground">{String(plansError)}</p>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    const setupPlans = async () => {
      try {
        const btn = document.querySelector('[data-testid="button-setup-plans"]') as HTMLButtonElement;
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Criando planos...";
        }

        const response = await fetch('/api/admin/setup-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "✅ Planos Criados!",
            description: `${data.created} planos foram configurados com sucesso!`,
          });
          
          // Recarregar a página após 1.5 segundos
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast({
            title: "Erro",
            description: data.message || "Erro ao criar planos",
            variant: "destructive",
          });
          if (btn) {
            btn.disabled = false;
            btn.textContent = "⚡ Criar Planos Automaticamente";
          }
        }
      } catch (err: any) {
        toast({
          title: "Erro",
          description: "Erro ao criar planos: " + err.message,
          variant: "destructive",
        });
        const btn = document.querySelector('[data-testid="button-setup-plans"]') as HTMLButtonElement;
        if (btn) {
          btn.disabled = false;
          btn.textContent = "⚡ Criar Planos Automaticamente";
        }
      }
    };

    const testDirectFetch = async () => {
      try {
        const response = await fetch('/api/plans');
        const text = await response.text();
        alert(`Status: ${response.status}\n\nResposta:\n${text.substring(0, 500)}`);
      } catch (err: any) {
        alert(`ERRO ao buscar:\n${err.message}`);
      }
    };

    const clearCacheAndReload = async () => {
      try {
        // Limpar cache do React Query
        queryClient.clear();
        // Limpar localStorage e sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        // Forçar recarregamento sem cache do navegador
        window.location.href = window.location.href + '?nocache=' + Date.now();
      } catch (err) {
        // Fallback: apenas recarregar
        window.location.reload();
      }
    };

    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Nenhum plano disponível</CardTitle>
              <CardDescription>
                Os planos de assinatura ainda não foram configurados neste banco de dados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-semibold mb-2 text-blue-900 dark:text-blue-100">💡 Solução Rápida</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Clique no botão abaixo para criar automaticamente os 4 planos de assinatura (Grátis, Básico, Profissional e Enterprise).
                </p>
                <Button 
                  onClick={setupPlans}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  data-testid="button-setup-plans"
                >
                  ⚡ Criar Planos Automaticamente
                </Button>
              </div>

              <details className="space-y-2">
                <summary className="cursor-pointer font-semibold text-sm text-muted-foreground">
                  🔍 Ver diagnóstico técnico
                </summary>
                <div className="bg-muted p-3 rounded text-sm space-y-1 font-mono mt-2">
                  <div>Planos carregados: {plans?.length || 0}</div>
                  <div>Tem erro: {plansError ? 'SIM' : 'NÃO'}</div>
                  {plansError && (
                    <div className="text-destructive break-words">
                      Erro: {String(plansError)}
                    </div>
                  )}
                  <div>Navegador online: {navigator.onLine ? 'SIM' : 'NÃO'}</div>
                  <div className="break-all">URL: {window.location.href}</div>
                </div>
                
                <div className="flex flex-col gap-2 mt-3">
                  <Button 
                    onClick={clearCacheAndReload}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="button-clear-cache"
                  >
                    Limpar Cache e Recarregar
                  </Button>
                  
                  <Button 
                    onClick={testDirectFetch}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="button-test-api"
                  >
                    Testar API /api/plans
                  </Button>
                </div>
              </details>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">Escolha seu Plano</h1>
          <p className="text-lg md:text-xl text-muted-foreground px-4">
            Expanda sua loja com os recursos que você precisa
          </p>
        </div>

        {currentSubscription && (
          <div className="mb-6 md:mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm font-medium">
              Plano Atual: <strong>{currentSubscription.plan?.name}</strong>
              {currentSubscription.status === "active" && (
                <Badge className="ml-2" variant="default">Ativo</Badge>
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {plans?.map((plan: any) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isFree = parseFloat(plan.price) === 0;

            return (
              <Card
                key={plan.id}
                className={`relative hover-elevate ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-plan-${plan.slug}`}
              >
                {plan.slug === "profissional" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    {getPlanIcon(plan.slug)}
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">
                        R$ {parseFloat(plan.price).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features?.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  {isCurrent ? (
                    <>
                      <Button disabled className="w-full" data-testid={`button-current-plan-${plan.slug}`}>
                        Plano Atual
                      </Button>
                      {!isFree && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => cancelMutation.mutate()}
                          disabled={cancelMutation.isPending}
                          data-testid={`button-cancel-${plan.slug}`}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar Assinatura
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => checkoutMutation.mutate(plan.id)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-subscribe-${plan.slug}`}
                    >
                      {isFree ? "Ativar Grátis" : "Assinar Agora"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 md:mt-12 text-center text-sm text-muted-foreground px-4">
          <p>Pagamento seguro processado pelo Stripe</p>
          <p className="mt-2">Cancele a qualquer momento, sem multas</p>
          <p className="mt-4 text-xs opacity-50">
            {plans.length} planos disponíveis
          </p>
        </div>
      </div>
    </div>
  );
}
