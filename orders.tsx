import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  processing: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export default function Orders() {
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Pedidos</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-4">
            <span className="text-2xl">📦</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum pedido ainda</h3>
          <p className="text-muted-foreground">
            Seus pedidos aparecerão aqui quando os clientes começarem a comprar
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-6 hover-elevate" data-testid={`order-${order.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Pedido #{order.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {order.createdAt && format(new Date(order.createdAt), "PPP 'às' p", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant={statusColors[order.status || "pending"]}>
                  {statusLabels[order.status || "pending"]}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium mb-1">Cliente</p>
                  <p className="text-sm text-muted-foreground">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Total</p>
                  <p className="text-lg font-bold text-primary">
                    R$ {parseFloat(order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  {parseFloat(order.discount || "0") > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Desconto: R$ {parseFloat(order.discount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm font-medium">Status:</p>
                <Select
                  value={order.status || "pending"}
                  onValueChange={(status) => updateStatus.mutate({ id: order.id, status })}
                >
                  <SelectTrigger className="w-48" data-testid={`select-status-${order.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="shipped">Enviado</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
