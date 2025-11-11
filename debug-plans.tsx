import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function DebugPlans() {
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [fetchError, setFetchError] = useState<any>(null);

  const { data: plans, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/plans"],
    retry: 3,
    retryDelay: 1000,
  });

  // Test direct fetch
  const testDirectFetch = async () => {
    try {
      const response = await fetch('/api/plans');
      const data = await response.json();
      setRawResponse(data);
      setFetchError(null);
    } catch (err: any) {
      setFetchError(err.message);
      setRawResponse(null);
    }
  };

  useEffect(() => {
    testDirectFetch();
  }, []);

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Debug - Planos</h1>

        <Card>
          <CardHeader>
            <CardTitle>Status da Query (TanStack)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div>Loading: {String(isLoading)}</div>
            <div>Has Error: {String(!!error)}</div>
            <div>Error: {error ? String(error) : 'null'}</div>
            <div>Plans Count: {plans?.length || 0}</div>
            <div>Plans Data: {JSON.stringify(plans, null, 2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fetch Direto (sem cache)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testDirectFetch} data-testid="button-test-fetch">
              <RefreshCw className="h-4 w-4 mr-2" />
              Testar Agora
            </Button>
            {fetchError && (
              <div className="p-2 bg-destructive/10 text-destructive text-sm font-mono rounded">
                Erro: {fetchError}
              </div>
            )}
            {rawResponse && (
              <div className="p-2 bg-muted text-sm font-mono rounded overflow-auto max-h-96">
                <pre>{JSON.stringify(rawResponse, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Info do Navegador</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-mono space-y-1">
            <div>User Agent: {navigator.userAgent}</div>
            <div>Online: {String(navigator.onLine)}</div>
            <div>URL: {window.location.href}</div>
          </CardContent>
        </Card>

        <Button onClick={() => refetch()} className="w-full" data-testid="button-refetch">
          <RefreshCw className="h-4 w-4 mr-2" />
          Recarregar Query
        </Button>
      </div>
    </div>
  );
}
