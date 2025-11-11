import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCouponSchema, type Coupon } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formSchema = insertCouponSchema.extend({
  value: z.string().min(1, "Valor é obrigatório"),
  minPurchase: z.string().optional(),
  maxUses: z.string().optional(),
  expiresAt: z.string().optional(),
});

export default function Coupons() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: "",
      minPurchase: "",
      maxUses: "",
      isActive: true,
      expiresAt: "",
    },
  });

  const createCoupon = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        value: parseFloat(data.value),
        minPurchase: data.minPurchase ? parseFloat(data.minPurchase) : null,
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      };

      if (editingCoupon) {
        await apiRequest("PATCH", `/api/coupons/${editingCoupon.id}`, payload);
      } else {
        await apiRequest("POST", "/api/coupons", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({
        title: editingCoupon ? "Cupom atualizado" : "Cupom criado",
        description: editingCoupon
          ? "O cupom foi atualizado com sucesso."
          : "Novo cupom de desconto criado.",
      });
      handleCloseDialog();
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (couponId: string) => {
      await apiRequest("DELETE", `/api/coupons/${couponId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({
        title: "Cupom excluído",
        description: "O cupom foi removido com sucesso.",
      });
    },
  });

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.reset({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minPurchase: coupon.minPurchase || "",
      maxUses: coupon.maxUses?.toString() || "",
      isActive: coupon.isActive ?? true,
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCoupon(null);
    form.reset();
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createCoupon.mutate(data);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Cupons de Desconto</h1>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-coupon">
          <Plus className="h-4 w-4 mr-2" />
          Criar Cupom
        </Button>
      </div>

      {!coupons || coupons.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-4">
            <Tag className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum cupom criado</h3>
          <p className="text-muted-foreground mb-6">
            Crie cupons de desconto para atrair e fidelizar clientes
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-coupon">
            <Plus className="h-4 w-4 mr-2" />
            Criar Cupom
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="p-6 hover-elevate" data-testid={`coupon-${coupon.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  <span className="font-mono font-bold text-lg">{coupon.code}</span>
                </div>
                {coupon.isActive ? (
                  <Badge>Ativo</Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-2xl font-bold text-primary">
                  {coupon.type === "percentage"
                    ? `${coupon.value}%`
                    : `R$ ${parseFloat(coupon.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </p>
                {coupon.minPurchase && (
                  <p className="text-sm text-muted-foreground">
                    Mínimo: R$ {parseFloat(coupon.minPurchase).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
                {coupon.maxUses && (
                  <p className="text-sm text-muted-foreground">
                    Usos: {coupon.usedCount || 0} / {coupon.maxUses}
                  </p>
                )}
                {coupon.expiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Expira em: {format(new Date(coupon.expiresAt), "PPP", { locale: ptBR })}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(coupon)}
                  data-testid={`button-edit-coupon-${coupon.id}`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir este cupom?")) {
                      deleteCoupon.mutate(coupon.id);
                    }
                  }}
                  data-testid={`button-delete-coupon-${coupon.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Editar Cupom" : "Criar Cupom"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: PRIMEIRACOMPRA" className="font-mono" data-testid="input-coupon-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-coupon-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-coupon-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minPurchase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compra Mínima (R$)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-coupon-min-purchase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Usos</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Ilimitado" data-testid="input-coupon-max-uses" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Expiração</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-coupon-expires" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-coupon">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCoupon.isPending} data-testid="button-save-coupon">
                  {createCoupon.isPending ? "Salvando..." : editingCoupon ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
