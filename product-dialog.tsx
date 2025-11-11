import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema, type InsertProduct, type Product, type Category } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";
import { Upload, X, Star, CreditCard, QrCode, TrendingUp, Zap } from "lucide-react";

const formSchema = insertProductSchema.extend({
  price: z.string().min(1, "Preço é obrigatório"),
  compareAtPrice: z.string().optional(),
  stock: z.string().min(1, "Estoque é obrigatório"),
  images: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  isPromotion: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

export function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const { toast } = useToast();
  const [uploadedImages, setUploadedImages] = useState<string[]>(product?.images || []);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      description: product?.description || "",
      price: product?.price || "",
      compareAtPrice: product?.compareAtPrice || "",
      stock: product?.stock?.toString() || "0",
      categoryId: product?.categoryId || null,
      images: product?.images?.join(", ") || "",
      isFeatured: product?.isFeatured ?? false,
      isPromotion: product?.isPromotion ?? false,
      isActive: product?.isActive ?? true,
    },
  });

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Não foi possível criar contexto do canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        continue;
      }

      try {
        const compressedImage = await compressImage(file);
        newImages.push(compressedImage);
      } catch (error) {
        console.error('Erro ao comprimir imagem:', error);
        toast({
          title: "Erro ao processar imagem",
          description: "Não foi possível processar uma das imagens.",
          variant: "destructive",
        });
      }
    }

    const updatedImages = [...uploadedImages, ...newImages];
    setUploadedImages(updatedImages);
    form.setValue('images', updatedImages.join(', '));
  };

  const removeImage = (index: number) => {
    const updatedImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(updatedImages);
    form.setValue('images', updatedImages.join(', '));
  };

  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        price: data.price,
        compareAtPrice: data.compareAtPrice || null,
        stock: parseInt(data.stock),
        images: uploadedImages.length > 0 ? uploadedImages : [],
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
        categoryId: data.categoryId || null,
        isFeatured: data.isFeatured ?? false,
        isPromotion: data.isPromotion ?? false,
        isActive: true,
      };

      if (product) {
        const response = await apiRequest("PATCH", `/api/products/${product.id}`, payload);
        if (!response.ok) {
          const error = await response.json();
          throw error;
        }
      } else {
        const response = await apiRequest("POST", "/api/products", payload);
        if (!response.ok) {
          const error = await response.json();
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: product ? "Produto atualizado" : "Produto criado",
        description: product
          ? "O produto foi atualizado com sucesso."
          : "Novo produto adicionado ao catálogo.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      if (error.upgradeRequired) {
        toast({
          title: "Limite de produtos atingido",
          description: error.message,
          variant: "destructive",
          action: (
            <a href="/dashboard/subscription" className="text-sm font-medium underline">
              Fazer Upgrade
            </a>
          ),
        });
      } else {
        toast({
          title: "Erro ao salvar produto",
          description: error.message || "Ocorreu um erro ao salvar o produto.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createProduct.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Camiseta Básica" data-testid="input-product-name" />
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
                  <FormLabel>Slug (URL amigável)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: camiseta-basica" data-testid="input-product-slug" />
                  </FormControl>
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
                      value={field.value || ""}
                      placeholder="Descrição detalhada do produto..."
                      rows={4}
                      data-testid="input-product-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-product-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="compareAtPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Comparação (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-product-compare-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Calculadora de Lucro Líquido */}
            {(() => {
              const price = parseFloat(form.watch("price")) || 0;
              
              if (price > 0) {
                // Taxas do Stripe
                const creditCardFee = price * 0.0299 + 0.39;
                const pixFee = price * 0.0099;
                
                // Valores líquidos
                const netCreditCard = price - creditCardFee;
                const netPix = price - pixFee;
                
                return (
                  <Card className="p-4 bg-muted/30 border-2 border-primary/20" data-testid="card-fee-calculator">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-sm">Calculadora de Lucro Líquido</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Preço do produto:</span>
                        <span className="font-semibold">
                          R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-muted-foreground">Pagamento com Cartão</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Taxa: 2,99% + R$ 0,39</span>
                              <span className="text-destructive">
                                - R$ {creditCardFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1 pt-1 border-t">
                              <span className="font-medium">Você recebe:</span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                R$ {netCreditCard.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 pt-2 border-t">
                          <QrCode className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-muted-foreground">Pagamento com PIX</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Taxa: 0,99%</span>
                              <span className="text-destructive">
                                - R$ {pixFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1 pt-1 border-t">
                              <span className="font-medium">Você recebe:</span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                R$ {netPix.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground italic">
                          As taxas do Stripe são descontadas automaticamente de cada venda. 
                          Os valores acima são o que você receberá na sua conta.
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0" data-testid="input-product-stock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria (opcional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-product-featured"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Destacar produto
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Aparece primeiro na vitrine
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPromotion"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-product-promotion"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        Produto em promoção
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Aparece na seção de promoções
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>Imagens do Produto</FormLabel>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Fazer Upload</TabsTrigger>
                  <TabsTrigger value="url">Usar URLs</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="border-2 border-dashed rounded-md p-6 text-center hover-elevate">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="image-upload"
                        data-testid="input-image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Clique para fazer upload</p>
                        <p className="text-xs text-muted-foreground mt-1">Ou arraste e solte arquivos aqui</p>
                      </label>
                    </div>
                    
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {uploadedImages.map((img, index) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                            <img src={img} alt={`Preview ${index + 1}`} className="object-cover w-full h-full" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => removeImage(index)}
                              data-testid={`button-remove-image-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="url">
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="https://exemplo.com/imagem1.jpg, https://exemplo.com/imagem2.jpg"
                            rows={3}
                            data-testid="input-product-images-url"
                            onChange={(e) => {
                              field.onChange(e);
                              const urls = e.target.value.split(',').map(url => url.trim()).filter(Boolean);
                              setUploadedImages(urls);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </FormItem>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={createProduct.isPending} data-testid="button-save-product">
                {createProduct.isPending ? "Salvando..." : product ? "Atualizar" : "Criar Produto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
