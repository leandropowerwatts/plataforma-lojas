import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import type { Product, Coupon } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Cart() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const { data: storeSlug } = useQuery<string>({
    queryKey: ["currentStoreSlug"],
    queryFn: () => localStorage.getItem("currentStoreSlug") || "",
  });

  const updateCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const updateQuantity = (productId: string, delta: number) => {
    const newCart = cartItems.map((item) => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(1, Math.min(item.quantity + delta, item.product.stock));
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    updateCart(newCart);
  };

  const removeItem = (productId: string) => {
    const newCart = cartItems.filter((item) => item.product.id !== productId);
    updateCart(newCart);
  };

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.price) * item.quantity;
  }, 0);

  const discount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? (subtotal * parseFloat(appliedCoupon.value)) / 100
      : parseFloat(appliedCoupon.value)
    : 0;

  const total = Math.max(0, subtotal - discount);

  const handleCheckout = () => {
    localStorage.setItem("checkoutCart", JSON.stringify(cartItems));
    localStorage.setItem("checkoutDiscount", discount.toString());
    localStorage.setItem("appliedCoupon", appliedCoupon ? JSON.stringify(appliedCoupon) : "");
    setLocation(`/checkout/${storeSlug}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-md bg-muted flex items-center justify-center mb-6">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mb-6">
              Adicione produtos para continuar comprando
            </p>
            <Button onClick={() => setLocation(`/store/${storeSlug}`)}>
              Continuar Comprando
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Carrinho de Compras</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.product.id} className="p-6" data-testid={`cart-item-${item.product.id}`}>
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Sem imagem</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{item.product.name}</h3>
                    <p className="text-lg font-bold text-primary mb-3">
                      R$ {parseFloat(item.product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 border rounded-md">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          disabled={item.quantity <= 1}
                          data-testid={`button-decrease-${item.product.id}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium" data-testid={`quantity-${item.product.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stock}
                          data-testid={`button-increase-${item.product.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.product.id)}
                        data-testid={`button-remove-${item.product.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">
                      R${" "}
                      {(parseFloat(item.product.price) * item.quantity).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h3 className="text-xl font-bold mb-6">Resumo do Pedido</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto</span>
                    <span className="font-medium">
                      - R$ {discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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

              {/* Coupon Input */}
              {!appliedCoupon && (
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Cupom de Desconto</label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Digite o código"
                      data-testid="input-coupon-code"
                    />
                    <Button variant="outline" size="sm" data-testid="button-apply-coupon">
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}

              {appliedCoupon && (
                <div className="mb-6">
                  <Badge className="mb-2">
                    Cupom aplicado: {appliedCoupon.code}
                  </Badge>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handleCheckout} data-testid="button-checkout">
                Finalizar Compra
              </Button>

              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setLocation(`/store/${storeSlug}`)}
                data-testid="button-continue-shopping"
              >
                Continuar Comprando
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
