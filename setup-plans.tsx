import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function SetupPlans() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [alreadyExists, setAlreadyExists] = useState(false);

  const handleSetup = async () => {
    setStatus("loading");
    setMessage("Criando planos...");

    try {
      const response = await fetch("/api/admin/setup-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setAlreadyExists(data.alreadyExists || false);
      } else {
        setStatus("error");
        setMessage(data.message || "Erro ao criar planos");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage("Erro ao conectar com o servidor: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configuração Inicial</CardTitle>
          <CardDescription>
            Configure os planos de assinatura do seu site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Clique no botão abaixo para criar os 4 planos de assinatura no banco de dados:
              </p>
              <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                <li>Grátis (R$ 0,00)</li>
                <li>Básico (R$ 29,90)</li>
                <li>Profissional (R$ 79,90)</li>
                <li>Enterprise (R$ 199,90)</li>
              </ul>
              <Button 
                onClick={handleSetup}
                className="w-full h-12 text-lg"
                data-testid="button-setup-plans"
              >
                Criar Planos Agora
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-semibold text-center text-green-600 dark:text-green-400">
                {message}
              </p>
              {!alreadyExists && (
                <p className="text-sm text-muted-foreground text-center">
                  Os planos foram criados com sucesso! Agora você pode acessar a página de assinaturas.
                </p>
              )}
              <Button 
                onClick={() => window.location.href = "/dashboard/subscription"}
                className="w-full"
                data-testid="button-go-to-plans"
              >
                Ver Planos de Assinatura
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <AlertCircle className="h-16 w-16 text-red-500" />
              <p className="text-lg font-semibold text-center text-red-600 dark:text-red-400">
                {message}
              </p>
              <Button 
                onClick={() => setStatus("idle")}
                variant="outline"
                className="w-full"
                data-testid="button-try-again"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
