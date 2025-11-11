import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function SimpleLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bem-vindo!</CardTitle>
          <CardDescription>
            Clique no botão abaixo para fazer login com sua conta Replit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            asChild
            className="w-full h-12 text-lg"
            size="lg"
            data-testid="button-login-replit"
          >
            <a href="/api/login">
              <LogIn className="h-5 w-5 mr-2" />
              Entrar com Replit
            </a>
          </Button>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              URL de login direto:
            </p>
            <div className="p-2 bg-muted rounded text-xs font-mono break-all">
              {window.location.origin}/api/login
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/login`);
                alert('Link copiado!');
              }}
              data-testid="button-copy-login-link"
            >
              Copiar Link de Login
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Navegador: {navigator.userAgent}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Online: {navigator.onLine ? 'Sim' : 'Não'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
