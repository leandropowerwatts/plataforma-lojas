import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertStoreSchema, type Store } from "@shared/schema";
import { z } from "zod";
import { Palette, ExternalLink, Copy, Check, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";

const formSchema = insertStoreSchema.omit({ userId: true }).extend({
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, 
    "Cor inválida. Use formato hexadecimal (#FFF ou #FFFFFF)"),
  secondaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, 
    "Cor inválida. Use formato hexadecimal (#FFF ou #FFFFFF)"),
  footerColor: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, 
    "Cor inválida. Use formato hexadecimal (#FFF ou #FFFFFF)"),
});

export default function StoreCustomization() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const { storeId } = useParams();
  const [, setLocation] = useLocation();

  const { data: store, isLoading, error } = useQuery<Store>({
    queryKey: ["/api/store", storeId],
    queryFn: async () => {
      const response = await fetch(`/api/store?storeId=${storeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch store");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro ao carregar loja",
        description: "A loja não foi encontrada. Redirecionando para lista de lojas...",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/dashboard/stores"), 1500);
    }
  }, [error, toast, setLocation]);

  const storeUrl = store?.slug ? `${window.location.origin}/store/${store.slug}` : "";

  const copyStoreUrl = () => {
    if (storeUrl) {
      navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link da sua loja foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      name: store?.name || "",
      slug: store?.slug || "",
      description: store?.description || "",
      about: store?.about || "",
      logo: store?.logo || "",
      banner: store?.banner || "",
      banners: store?.banners || [],
      primaryColor: store?.primaryColor || "#217BF4",
      secondaryColor: store?.secondaryColor || "#E5E7EB",
      footerColor: store?.footerColor || "#1F2937",
      headerAlignment: store?.headerAlignment || "center",
      whatsappNumber: store?.whatsappNumber || "",
      footerAddress: store?.footerAddress || "",
      footerCnpj: store?.footerCnpj || "",
      footerPhone: store?.footerPhone || "",
      isActive: store?.isActive ?? true,
    },
  });

  const updateStore = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest("PATCH", `/api/store?storeId=${storeId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store", storeId] });
      toast({
        title: "Loja atualizada",
        description: "As configurações da sua loja foram salvas com sucesso.",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateStore.mutate(data);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Palette className="h-8 w-8 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold">Personalização da Loja</h1>
      </div>

      {store?.slug && (
        <Card className="mb-6 md:mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5" />
              Link da Sua Loja Pública
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={storeUrl}
                readOnly
                className="flex-1 font-mono text-sm bg-background"
                data-testid="input-store-url"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={copyStoreUrl}
                  className="flex-1 sm:flex-none"
                  data-testid="button-copy-store-url"
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button
                  type="button"
                  onClick={() => window.open(storeUrl, "_blank")}
                  className="flex-1 sm:flex-none"
                  data-testid="button-open-store"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Loja
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Compartilhe este link com seus clientes para que eles possam acessar sua loja e fazer pedidos.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Visuais</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Loja</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Minha Loja" data-testid="input-store-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Loja (slug)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="minha-loja" data-testid="input-store-slug" />
                      </FormControl>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sua loja ficará em: /store/{field.value || "minha-loja"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descrição da sua loja..."
                          rows={3}
                          data-testid="input-store-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobre a Loja</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Conte mais sobre sua loja, produtos e diferenciais..."
                          rows={5}
                          data-testid="input-store-about"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground mt-1">
                        Este texto aparecerá na página da vitrine antes dos produtos
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp (com código do país)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="5511999999999"
                          data-testid="input-store-whatsapp"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground mt-1">
                        Exemplo: 5511999999999 (país + DDD + número)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-6 mt-6">
                  <h3 className="font-semibold text-lg mb-4">Informações do Rodapé</h3>
                  
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="footerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Rua Exemplo, 123 - Bairro - Cidade - UF - CEP 00000-000"
                              rows={3}
                              data-testid="input-store-footer-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="footerCnpj"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="00.000.000/0000-00"
                                data-testid="input-store-footer-cnpj"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="footerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone de Contato</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="(11) 99999-9999"
                                data-testid="input-store-footer-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Logo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://exemplo.com/logo.png" data-testid="input-store-logo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="banner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Banner (Legado)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://exemplo.com/banner.jpg" data-testid="input-store-banner" />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Use "Carrossel de Banners" abaixo para múltiplas imagens
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="banners"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrossel de Banners</FormLabel>
                      <FormDescription>
                        Adicione múltiplas imagens que serão exibidas em carrossel automático na loja pública
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-3">
                          {field.value && field.value.length > 0 && (
                            <div className="space-y-2">
                              {field.value.map((bannerUrl, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                                  <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                                  <Input
                                    value={bannerUrl}
                                    onChange={(e) => {
                                      const newBanners = [...field.value];
                                      newBanners[index] = e.target.value;
                                      field.onChange(newBanners);
                                    }}
                                    placeholder="https://exemplo.com/banner.jpg"
                                    className="flex-1"
                                    data-testid={`input-banner-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                      const newBanners = field.value.filter((_, i) => i !== index);
                                      field.onChange(newBanners);
                                    }}
                                    data-testid={`button-remove-banner-${index}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Input
                              value={newBannerUrl}
                              onChange={(e) => setNewBannerUrl(e.target.value)}
                              placeholder="Cole a URL do banner aqui..."
                              data-testid="input-new-banner"
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (newBannerUrl.trim()) {
                                  field.onChange([...(field.value || []), newBannerUrl.trim()]);
                                  setNewBannerUrl("");
                                }
                              }}
                              data-testid="button-add-banner"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Primária</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} type="color" className="w-16 h-10 p-1" data-testid="input-store-primary-color" />
                            <Input {...field} placeholder="#217BF4" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Secundária (Carrinho)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} type="color" className="w-16 h-10 p-1" data-testid="input-store-secondary-color" />
                            <Input {...field} placeholder="#E5E7EB" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Usada no botão do carrinho
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="footerColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Rodapé</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} type="color" className="w-16 h-10 p-1" data-testid="input-store-footer-color" />
                          <Input {...field} placeholder="#1F2937" />
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Cor de fundo do rodapé da loja pública
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="headerAlignment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alinhamento do Cabeçalho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-header-alignment">
                            <SelectValue placeholder="Selecione o alinhamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="left">Esquerda</SelectItem>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="right">Direita</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Escolha como o logo e nome da loja serão alinhados no cabeçalho
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={updateStore.isPending} className="w-full" data-testid="button-save-customization">
                  {updateStore.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              {/* Banner Preview */}
              <div
                className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 relative"
                style={{
                  backgroundColor: form.watch("primaryColor") || "#217BF4",
                  backgroundImage: form.watch("banner") ? `url(${form.watch("banner")})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-end gap-3">
                  {form.watch("logo") && (
                    <img
                      src={form.watch("logo")}
                      alt="Logo"
                      className="h-16 w-16 rounded-md border-4 border-white object-cover"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{form.watch("name") || "Minha Loja"}</h2>
                    {form.watch("description") && (
                      <p className="text-sm text-foreground/80 line-clamp-1">
                        {form.watch("description")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sample Product Card */}
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">Exemplo de produto:</p>
                <div className="border rounded-md overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">Imagem do Produto</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold mb-2">Produto de Exemplo</h3>
                    <p className="text-xl font-bold mb-3" style={{ color: form.watch("primaryColor") || "#217BF4" }}>
                      R$ 99,90
                    </p>
                    <Button
                      className="w-full"
                      style={{
                        backgroundColor: form.watch("primaryColor") || "#217BF4",
                        color: "white",
                      }}
                    >
                      Adicionar ao Carrinho
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
