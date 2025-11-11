import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Product, Store } from "@shared/schema";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Nome é obrigatório"),
  customerEmail: z.string().email("Email inválido"),
  customerPhone: z.string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(11, "Telefone deve ter no máximo 11 dígitos")
    .regex(/^[0-9]+$/, "Telefone deve conter apenas números"),
  street: z.string().min(1, "Endereço é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  zipCode: z.string().min(1, "CEP é obrigatório"),
  country: z.string().default("BR"),
});

interface CartItem {
  product: Product;
  quantity: number;
}

function CheckoutForm({ total, onSuccess, clientSecret }: { total: number; onSuccess: () => void; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWaitingForPix, setIsWaitingForPix] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start polling for PIX payment status
  const startPixPolling = useCallback(async () => {
    if (!stripe || !clientSecret) return;

    setIsWaitingForPix(true);
    setIsProcessing(false);

    toast({
      title: "Aguardando pagamento PIX",
      description: "Escaneie o código QR acima com o app do seu banco",
    });

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

        if (paymentIntent?.status === "succeeded") {
          // Payment confirmed!
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setIsWaitingForPix(false);
          toast({
            title: "Pagamento confirmado!",
            description: "Seu pagamento PIX foi recebido com sucesso.",
          });
          setTimeout(() => onSuccess(), 500);
        } else if (paymentIntent?.status === "canceled") {
          // Payment canceled
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setIsWaitingForPix(false);
          toast({
            title: "Pagamento cancelado",
            description: "O pagamento foi cancelado. Você pode tentar novamente.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error polling payment status:", error);
      }
    }, 3000);
  }, [stripe, clientSecret, onSuccess, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/payment-success",
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Erro no pagamento",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Payment completed immediately (simple card)
      onSuccess();
    } else if (paymentIntent && (paymentIntent.status === "requires_action" || paymentIntent.status === "processing")) {
      // PIX or async payment - start polling
      startPixPolling();
    } else {
      // Unknown status - reset
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {isWaitingForPix && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            ⏳ Aguardando confirmação do pagamento PIX
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Escaneie o código QR acima com o app do seu banco
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            A página será atualizada automaticamente após a confirmação
          </p>
        </div>
      )}
      
      {!isWaitingForPix && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            💳 Cartão de Crédito ou 💱 PIX
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Escolha seu método de pagamento preferido acima
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            • PIX: Pagamento instantâneo via QR Code
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            • Cartão: Processamento imediato e seguro
          </p>
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing || isWaitingForPix} 
        className="w-full" 
        size="lg" 
        data-testid="button-pay"
      >
        {isProcessing ? "Processando..." : isWaitingForPix ? "Aguardando pagamento PIX..." : `Pagar R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [shippingMessage, setShippingMessage] = useState("");
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const storeSlug = params.slug;

  const { data: store } = useQuery<Store>({
    queryKey: [`/api/stores/${storeSlug}`],
  });

  const [cartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("checkoutCart");
    return saved ? JSON.parse(saved) : [];
  });

  const discount = parseFloat(localStorage.getItem("checkoutDiscount") || "0");

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.price) * item.quantity;
  }, 0);

  const total = Math.max(0, subtotal - discount + shippingCost);

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "BR",
    },
  });

  const calculateShipping = async (zipCode: string) => {
    if (!storeSlug || zipCode.length < 8) return;

    setIsCalculatingShipping(true);
    setShippingMessage("");

    try {
      const response = await apiRequest("POST", "/api/shipping/calculate", {
        storeSlug,
        zipCode: zipCode.replace(/\D/g, ""),
        orderTotal: subtotal - discount,
      });

      if (!response.ok) {
        throw new Error("Erro ao calcular frete");
      }

      const data = await response.json();
      
      if (data.isFree) {
        setShippingCost(0);
        setShippingMessage("Frete grátis!");
      } else {
        setShippingCost(parseFloat(data.shippingCost));
        setShippingMessage(
          data.estimatedDays 
            ? `Frete: R$ ${parseFloat(data.shippingCost).toFixed(2)} (${data.estimatedDays} dias)`
            : `Frete: R$ ${parseFloat(data.shippingCost).toFixed(2)}`
        );
      }
    } catch (error) {
      console.error("Erro ao calcular frete:", error);
      setShippingCost(0);
      setShippingMessage("Não foi possível calcular o frete");
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const createOrder = useMutation({
    mutationFn: async (data: z.infer<typeof checkoutSchema>) => {
      if (!store) throw new Error("Store not found");

      const shippingAddress = {
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
      };

      const orderData = {
        storeId: store.id,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        shippingAddress,
        total: total.toString(),
        discount: discount.toString(),
        shippingCost: shippingCost.toString(),
        status: "pending",
        items: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.images?.[0] || null,
          quantity: item.quantity,
          price: item.product.price,
        })),
      };

      const orderResponse = await apiRequest("POST", "/api/orders", orderData);
      
      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.message || "Erro ao criar pedido");
      }
      
      const order = await orderResponse.json();
      
      // Save order data for confirmation page with store slug
      localStorage.setItem("lastOrder", JSON.stringify({
        ...order,
        storeSlug: storeSlug,
      }));

      // Create payment intent
      try {
        const paymentResponse = await apiRequest("POST", "/api/create-payment-intent", {
          amount: total,
        });

        if (!paymentResponse.ok) {
          throw new Error("Payment processing not configured");
        }

        const paymentData = await paymentResponse.json();
        return paymentData.clientSecret;
      } catch (error) {
        // If Stripe is not configured, allow order creation without payment
        console.warn("Payment processing not available:", error);
        return null;
      }
    },
    onSuccess: (secret) => {
      if (secret) {
        setClientSecret(secret);
        setOrderCreated(true);
        toast({
          title: "Pedido criado",
          description: "Complete o pagamento para finalizar.",
        });
      } else {
        // Payment not configured - complete order without payment
        toast({
          title: "Pedido criado com sucesso",
          description: "Seu pedido foi registrado. Entre em contato com a loja para pagamento.",
        });
        setTimeout(() => {
          handlePaymentSuccess();
        }, 2000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof checkoutSchema>) => {
    createOrder.mutate(data);
  };

  const handlePaymentSuccess = () => {
    localStorage.removeItem("cart");
    localStorage.removeItem("checkoutCart");
    localStorage.removeItem("checkoutDiscount");
    localStorage.removeItem("appliedCoupon");
    setLocation(`/order-confirmation/${storeSlug}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-3">Carrinho vazio</h2>
          <p className="text-muted-foreground mb-6">
            Adicione produtos ao carrinho para continuar
          </p>
          <Button onClick={() => setLocation(`/store/${storeSlug}`)}>
            Voltar para a Loja
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6">Informações de Entrega</h3>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Seu nome" data-testid="input-customer-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="seu@email.com" data-testid="input-customer-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone/Celular</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="tel" 
                            placeholder="(11) 99999-9999" 
                            data-testid="input-customer-phone"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Rua, número, complemento" data-testid="input-street" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Cidade" data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="UF" maxLength={2} data-testid="input-state" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="00000-000" 
                                data-testid="input-zipcode"
                                maxLength={9}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, "");
                                  field.onChange(value);
                                  if (value.length === 8) {
                                    calculateShipping(value);
                                  }
                                }}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => calculateShipping(field.value)}
                              disabled={field.value.length < 8 || isCalculatingShipping}
                              data-testid="button-calculate-shipping"
                            >
                              {isCalculatingShipping ? "..." : "Calcular"}
                            </Button>
                          </div>
                          <FormMessage />
                          {shippingMessage && (
                            <p className={`text-sm mt-1 ${shippingCost === 0 ? "text-green-600" : "text-muted-foreground"}`}>
                              {shippingMessage}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  {!orderCreated && (
                    <Button type="submit" disabled={createOrder.isPending} className="w-full" size="lg" data-testid="button-create-order">
                      {createOrder.isPending ? "Criando pedido..." : "Continuar para Pagamento"}
                    </Button>
                  )}
                </form>
              </Form>

              {/* Payment Section */}
              {orderCreated && clientSecret && stripePromise && (
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-xl font-bold mb-6">Pagamento</h3>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm total={total} onSuccess={handlePaymentSuccess} clientSecret={clientSecret} />
                  </Elements>
                </div>
              )}
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h3 className="text-xl font-bold mb-6">Resumo</h3>

              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.product.images?.[0] && (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-2">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                      <p className="text-sm font-medium">
                        R${" "}
                        {(parseFloat(item.product.price) * item.quantity).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto</span>
                    <span>- R$ {discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {shippingMessage && (
                  <div className={`flex justify-between ${shippingCost === 0 ? "text-green-600" : ""}`}>
                    <span>Frete</span>
                    <span>
                      {shippingCost === 0 
                        ? "Grátis" 
                        : `R$ ${shippingCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
