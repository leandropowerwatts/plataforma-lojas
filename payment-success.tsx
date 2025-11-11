import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentId = urlParams.get("payment_intent");
      const redirectStatus = urlParams.get("redirect_status");

      if (!paymentIntentId) {
        console.error("No payment intent found");
        setError("Informações de pagamento não encontradas");
        return;
      }

      // Check if payment was successful
      // Accept both "succeeded" and "not_required" as success states
      if (redirectStatus !== "succeeded" && redirectStatus !== "not_required") {
        console.error("Payment failed with status:", redirectStatus);
        setError(
          redirectStatus === "failed"
            ? "O pagamento não foi concluído. Por favor, tente novamente."
            : "Erro ao processar o pagamento. Por favor, entre em contato conosco."
        );
        // Keep cart intact so user can retry
        return;
      }

      // Get store slug from localStorage
      const lastOrder = localStorage.getItem("lastOrder");
      if (!lastOrder) {
        console.error("No order data found");
        setError("Dados do pedido não encontrados");
        return;
      }

      const order = JSON.parse(lastOrder);
      const storeSlug = order.storeSlug;

      if (!storeSlug) {
        console.error("No store slug found in order data");
        setError("Informações da loja não encontradas");
        return;
      }

      // Clear cart items only on successful payment
      localStorage.removeItem("cart");
      localStorage.removeItem("checkoutCart");
      localStorage.removeItem("checkoutDiscount");
      localStorage.removeItem("appliedCoupon");

      // Redirect to confirmation page
      setLocation(`/order-confirmation/${storeSlug}`);
    };

    processPayment();
  }, [setLocation]);

  if (error) {
    // Get store slug from last order to redirect back
    const lastOrder = localStorage.getItem("lastOrder");
    const storeSlug = lastOrder ? JSON.parse(lastOrder).storeSlug : null;

    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-muted/30">
        <Card className="p-8 max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Erro no Pagamento</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {storeSlug && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation(`/checkout/${storeSlug}`)}
                  data-testid="button-retry-payment"
                >
                  Tentar Novamente
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => setLocation(storeSlug ? `/store/${storeSlug}` : "/")}
                data-testid="button-back-to-store"
              >
                Voltar à Loja
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Processing payment" />
        <p className="text-muted-foreground">Processando pagamento...</p>
      </div>
    </div>
  );
}
