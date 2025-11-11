import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Store as StoreType } from "@shared/schema";

export default function OrderConfirmation() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const storeSlug = params.slug;

  const { data: store } = useQuery<StoreType>({
    queryKey: [`/api/stores/${storeSlug}`],
  });

  const [orderData] = useState(() => {
    const saved = localStorage.getItem("lastOrder");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (orderData) {
      localStorage.removeItem("lastOrder");
    }
  }, [orderData]);

  if (!orderData || !store) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-3">Pedido não encontrado</h2>
          <p className="text-muted-foreground mb-6">
            Não foi possível encontrar as informações do pedido.
          </p>
          <Button onClick={() => setLocation(`/store/${storeSlug}`)}>
            Voltar para a Loja
          </Button>
        </Card>
      </div>
    );
  }

  const orderNumber = orderData.id?.substring(0, 8).toUpperCase() || "XXXXX";

  return (
    <div className="min-h-screen p-8 bg-muted/30">
      <div className="container mx-auto max-w-3xl">
        <Card className="p-8 md:p-12">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${store.primaryColor}15` }}>
              <CheckCircle className="w-12 h-12" style={{ color: store.primaryColor }} />
            </div>
          </div>

          {/* Thank You Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-3">
            Obrigado pela sua compra!
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Olá {orderData.customerName}, seu pedido foi confirmado com sucesso.
          </p>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-lg mb-4">Resumo do Pedido</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número do Pedido:</span>
                <span className="font-semibold">#{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold text-lg">
                  R$ {parseFloat(orderData.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-green-600">Em processamento</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-2">📧 Confirme seu email</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enviamos um email de confirmação para <strong>{orderData.customerEmail}</strong> com todos os detalhes do seu pedido.
            </p>
            <h3 className="font-semibold mb-2">📱 Mantenha seu telefone próximo</h3>
            <p className="text-sm text-muted-foreground">
              Podemos entrar em contato pelo número <strong>{orderData.customerPhone}</strong> para atualizações sobre sua entrega.
            </p>
          </div>

          {/* Store Contact */}
          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold mb-4">Entre em contato conosco</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Você receberá atualizações sobre o status do seu pedido. Se tiver alguma dúvida, entre em contato:
            </p>
            
            {store.whatsappNumber && (
              <Button
                className="w-full mb-3"
                style={{ backgroundColor: store.primaryColor }}
                onClick={() => {
                  const message = `Olá! Gostaria de saber sobre meu pedido #${orderNumber}`;
                  const phone = store.whatsappNumber!.replace(/\D/g, "");
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
                }}
                data-testid="button-contact-whatsapp"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar no WhatsApp
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setLocation(`/store/${storeSlug}`)}
              data-testid="button-continue-shopping"
            >
              <Store className="w-4 h-4 mr-2" />
              Continuar Comprando
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>
              Obrigado por escolher a <strong>{store.name}</strong>!
            </p>
            <p className="mt-2">
              Salve este número de pedido para referência futura: <strong>#{orderNumber}</strong>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
