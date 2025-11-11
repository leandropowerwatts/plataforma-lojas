import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Package, CreditCard, BarChart3, Palette, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Loja Fácil</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Entrar</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Crie Sua Loja Online em Minutos
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Plataforma completa para empreendedores venderem online. Catálogo de produtos, carrinho de compras, pagamentos e muito mais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg" data-testid="button-get-started">
                <a href="/api/login">Começar Agora</a>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg" 
                data-testid="button-learn-more"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
              >
                Saiba Mais
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que Você Precisa para Vender Online
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Recursos completos para criar, gerenciar e expandir sua loja virtual
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 hover-elevate">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestão de Produtos</h3>
              <p className="text-muted-foreground">
                Cadastre produtos com múltiplas imagens, variações de tamanho/cor, controle de estoque e categorias.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Carrinho de Compras</h3>
              <p className="text-muted-foreground">
                Experiência de compra fluida com carrinho intuitivo, cupons de desconto e cálculo automático de totais.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pagamentos Seguros</h3>
              <p className="text-muted-foreground">
                Integração com Stripe para processar pagamentos de forma segura e confiável.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Dashboard Completo</h3>
              <p className="text-muted-foreground">
                Acompanhe vendas, pedidos e produtos mais vendidos com estatísticas em tempo real.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalização Visual</h3>
              <p className="text-muted-foreground">
                Customize cores, logo e banner da sua loja para refletir a identidade da sua marca.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestão de Pedidos</h3>
              <p className="text-muted-foreground">
                Gerencie pedidos, atualize status de entrega e mantenha seus clientes informados.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para Começar a Vender?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Crie sua loja online agora mesmo e comece a vender em minutos. Sem taxas de setup, sem complicação.
            </p>
            <Button size="lg" asChild className="text-lg" data-testid="button-cta-login">
              <a href="/api/login">Criar Minha Loja Grátis</a>
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="font-semibold">Loja Fácil</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Plataforma de Lojas Online. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
