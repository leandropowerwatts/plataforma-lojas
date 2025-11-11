import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, Star, Grid3x3, MessageCircle, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Store, Product, Category } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreCarousel } from "@/components/store-carousel";

interface CartItem {
  product: Product;
  quantity: number;
}

// Calcula se uma cor é clara ou escura para escolher a cor do texto apropriada
function getContrastTextColor(hexColor: string): string {
  // Remove # se presente e espaços
  let hex = hexColor.replace('#', '').trim();
  
  // Normaliza cores de 3 dígitos (#FFF -> #FFFFFF)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Remove canal alpha se presente (8 dígitos -> 6 dígitos)
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }
  
  // Valida que temos exatamente 6 caracteres hexadecimais
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    // Cor inválida, retorna preto (seguro para fundo branco padrão)
    return '#000000';
  }
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calcula a luminosidade relativa (WCAG)
  // https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Se a luminosidade for maior que 0.5, a cor é clara, use texto escuro
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function ProductCard({ product, addToCart, secondaryColor }: { product: Product; addToCart: (product: Product) => void; secondaryColor?: string }) {
  const buttonColor = secondaryColor || '#6366f1';
  const textColor = getContrastTextColor(buttonColor);
  
  return (
    <Card
      className="overflow-hidden hover-elevate group cursor-pointer"
      data-testid={`storefront-product-${product.id}`}
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground">Sem imagem</span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Badge variant="destructive">Esgotado</Badge>
          </div>
        )}
        {product.isFeatured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500 text-black gap-1">
              <Star className="h-3 w-3 fill-black" />
              Destaque
            </Badge>
          </div>
        )}
        {product.isPromotion && !product.isFeatured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-orange-500 text-white gap-1">
              <Zap className="h-3 w-3 fill-white" />
              Promoção
            </Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2 min-h-[3rem]">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`product-description-${product.id}`}>
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl font-bold text-primary">
            R$ {parseFloat(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          {product.compareAtPrice && (
            <span className="text-sm text-muted-foreground line-through">
              R$ {parseFloat(product.compareAtPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <Button 
          className="w-full" 
          disabled={product.stock === 0} 
          onClick={() => addToCart(product)}
          style={{
            backgroundColor: buttonColor,
            color: textColor
          }}
          data-testid={`button-add-cart-${product.id}`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {product.stock === 0 ? "Esgotado" : "Adicionar ao Carrinho"}
        </Button>
      </div>
    </Card>
  );
}

export default function Storefront() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const storeSlug = params.slug;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    localStorage.setItem("currentStoreSlug", storeSlug || "");
    const updateCartCount = () => {
      const saved = localStorage.getItem("cart");
      const items: CartItem[] = saved ? JSON.parse(saved) : [];
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
    };
    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    return () => window.removeEventListener("storage", updateCartCount);
  }, [storeSlug]);

  const addToCart = (product: Product) => {
    const saved = localStorage.getItem("cart");
    const cart: CartItem[] = saved ? JSON.parse(saved) : [];
    
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ product, quantity: 1 });
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    
    toast({
      title: "Produto adicionado",
      description: `${product.name} foi adicionado ao carrinho`,
    });
  };

  const { data: store, isLoading: storeLoading } = useQuery<Store>({
    queryKey: [`/api/stores/${storeSlug}`],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: [`/api/stores/${storeSlug}/products`],
    enabled: !!store,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: [`/api/stores/${storeSlug}/categories`],
    enabled: !!store,
  });

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  });

  // Organizar produtos: destacados primeiro, depois promoções, depois por categoria
  const organizedProducts = () => {
    if (!filteredProducts) return { featured: [], promotions: [], byCategory: [] };
    
    const featured = filteredProducts.filter(p => p.isFeatured);
    const promotions = filteredProducts.filter(p => !p.isFeatured && p.isPromotion);
    const regular = filteredProducts.filter(p => !p.isFeatured && !p.isPromotion);
    
    // Agrupar produtos regulares por categoria
    const byCategory: { category: Category | null; products: Product[] }[] = [];
    
    // Produtos sem categoria
    const uncategorized = regular.filter(p => !p.categoryId);
    if (uncategorized.length > 0) {
      byCategory.push({ category: null, products: uncategorized });
    }
    
    // Produtos por categoria
    categories.forEach(category => {
      const categoryProducts = regular.filter(p => p.categoryId === category.id);
      if (categoryProducts.length > 0) {
        byCategory.push({ category, products: categoryProducts });
      }
    });
    
    return { featured, promotions, byCategory };
  };

  const { featured, promotions, byCategory } = organizedProducts();

  if (storeLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-64 w-full" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Loja não encontrada</h2>
          <p className="text-muted-foreground">
            Esta loja não existe ou foi desativada
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header Original com Banner */}
      <div className="relative" data-testid="storefront-header">
        {/* Banner de Fundo */}
        {store.banner && (
          <div
            className="h-64 md:h-80 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${store.banner})`,
            }}
          />
        )}
        
        {/* Fundo com Cor Primária (quando não há banner) */}
        {!store.banner && store.primaryColor && (
          <div
            className="h-64 md:h-80"
            style={{
              backgroundColor: store.primaryColor,
            }}
          />
        )}
        
        {/* Logo e Nome da Loja */}
        <div className={`${store.banner || store.primaryColor ? 'absolute inset-0' : 'bg-background border-b py-12'} flex flex-col ${
          store.headerAlignment === 'left' ? 'items-start justify-center px-8 md:px-16' :
          store.headerAlignment === 'right' ? 'items-end justify-center px-8 md:px-16' :
          store.headerAlignment === 'center' ? 'items-center justify-center' :
          'items-center justify-center'
        }`}>
          {store.logo && (
            <img
              src={store.logo}
              alt={store.name}
              className="h-24 w-24 md:h-32 md:w-32 object-contain mb-4 bg-background/90 p-2 rounded-lg"
              data-testid="store-logo-header"
            />
          )}
          <h1 
            className={`text-3xl md:text-4xl lg:text-5xl font-bold ${
              store.headerAlignment === 'left' ? 'text-left' :
              store.headerAlignment === 'right' ? 'text-right' :
              store.headerAlignment === 'center' ? 'text-center' :
              'text-center'
            } ${store.banner || store.primaryColor ? 'text-white drop-shadow-lg' : ''}`}
            data-testid="store-name-header"
          >
            {store.name}
          </h1>
          {store.description && (
            <p className={`text-lg mt-2 max-w-2xl px-4 ${
              store.headerAlignment === 'left' ? 'text-left' :
              store.headerAlignment === 'right' ? 'text-right' :
              store.headerAlignment === 'center' ? 'text-center' :
              'text-center'
            } ${store.banner || store.primaryColor ? 'text-white drop-shadow-md' : 'text-muted-foreground'}`}>
              {store.description}
            </p>
          )}
        </div>

        {/* Botão do Carrinho (Sticky no Topo) */}
        <div className="sticky top-0 z-40 backdrop-blur-sm border-b" style={{ 
          background: `linear-gradient(to right, ${store.secondaryColor || '#6366f1'}15, ${store.secondaryColor || '#6366f1'}08, ${store.secondaryColor || '#6366f1'}15)`,
          borderColor: `${store.secondaryColor || '#6366f1'}20`
        }}>
          <div className="w-full px-4 py-4 flex items-center justify-center">
            <Button
              size="lg"
              className="gap-4 group shadow-lg"
              style={{
                backgroundColor: store.secondaryColor || '#6366f1',
                color: getContrastTextColor(store.secondaryColor || '#6366f1')
              }}
              onClick={() => setLocation(`/cart/${storeSlug}`)}
              data-testid="button-view-cart"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <div className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-xs font-bold text-white">{cartCount}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium opacity-90">Meu</span>
                <span className="text-base font-bold">Carrinho</span>
              </div>
              {cartCount > 0 && (
                <Badge className="bg-white/90 ml-2" style={{ color: store.secondaryColor || '#6366f1' }}>
                  {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* About Section */}
        {store.about && (
          <div className="mb-8">
            <Card className="p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-4">Sobre a Loja</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="store-about">
                {store.about}
              </p>
            </Card>
          </div>
        )}

        {/* Store Carousel - Abaixo de "Sobre a Loja" */}
        {(store.banners && store.banners.length > 0) || store.banner ? (
          <div className="mb-8">
            <StoreCarousel
              banners={store.banners || (store.banner ? [store.banner] : [])}
            />
          </div>
        ) : null}
        {/* Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
                data-testid="input-search-storefront"
              />
            </div>
            
            {/* WhatsApp Button */}
            {store?.whatsappNumber && (
              <Button
                asChild
                size="lg"
                className="h-12 gap-2"
                style={{ backgroundColor: "#25D366" }}
                data-testid="button-whatsapp"
              >
                <a
                  href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-5 w-5 text-white" />
                  <span className="text-white font-medium">Falar com a Loja</span>
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Categories Filter */}
        {categories.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Grid3x3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Categorias</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("")}
                data-testid="category-all"
              >
                Todas
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`category-${category.id}`}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {productsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : !filteredProducts || filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Esta loja ainda não tem produtos"}
            </p>
          </Card>
        ) : (
          <div className="space-y-12">
            {/* Featured Products */}
            {featured.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                  <h2 className="text-2xl font-bold">Produtos em Destaque</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featured.map((product) => (
                    <ProductCard key={product.id} product={product} addToCart={addToCart} secondaryColor={store.secondaryColor} />
                  ))}
                </div>
              </div>
            )}

            {/* Promotional Products */}
            {promotions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Zap className="h-6 w-6 text-orange-500 fill-orange-500" />
                  <h2 className="text-2xl font-bold">Promoções</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {promotions.map((product) => (
                    <ProductCard key={product.id} product={product} addToCart={addToCart} secondaryColor={store.secondaryColor} />
                  ))}
                </div>
              </div>
            )}

            {/* Products by Category */}
            {byCategory.map((group, index) => (
              <div key={index}>
                <h2 className="text-2xl font-bold mb-6">
                  {group.category?.name || "Outros Produtos"}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.products.map((product) => (
                    <ProductCard key={product.id} product={product} addToCart={addToCart} secondaryColor={store.secondaryColor} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer 
        className="border-t mt-16" 
        style={{ 
          backgroundColor: store.footerColor || '#1F2937',
          color: getContrastTextColor(store.footerColor || '#1F2937')
        }}
      >
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Logo e Nome da Loja */}
            <div>
              {store.logo && (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="h-16 w-16 rounded-md object-cover mb-4"
                  data-testid="footer-logo"
                />
              )}
              <h3 className="font-bold text-xl mb-2" data-testid="footer-store-name">{store.name}</h3>
              {store.description && (
                <p className="text-sm opacity-70 line-clamp-3" data-testid="footer-store-description">
                  {store.description}
                </p>
              )}
            </div>

            {/* Informações de Contato */}
            <div>
              <h4 className="font-semibold text-lg mb-4">Contato</h4>
              <div className="space-y-3 text-sm">
                {store.footerPhone && (
                  <div className="flex items-start gap-2" data-testid="footer-phone">
                    <span className="opacity-70">Telefone:</span>
                    <span>{store.footerPhone}</span>
                  </div>
                )}
                {store.whatsappNumber && (
                  <div className="flex items-start gap-2" data-testid="footer-whatsapp">
                    <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <a 
                      href={`https://wa.me/${store.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Endereço e CNPJ */}
            <div>
              <h4 className="font-semibold text-lg mb-4">Informações</h4>
              <div className="space-y-3 text-sm">
                {store.footerAddress && (
                  <div data-testid="footer-address">
                    <p className="opacity-70 mb-1">Endereço:</p>
                    <p className="whitespace-pre-line">{store.footerAddress}</p>
                  </div>
                )}
                {store.footerCnpj && (
                  <div data-testid="footer-cnpj">
                    <p className="opacity-70 mb-1">CNPJ:</p>
                    <p>{store.footerCnpj}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t opacity-20 mt-8 pt-6 text-center">
            <p className="text-sm opacity-70" data-testid="footer-copyright">
              © {new Date().getFullYear()} {store.name}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
