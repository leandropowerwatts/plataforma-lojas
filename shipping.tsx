import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Package } from "lucide-react";
import type { ShippingConfig, ShippingZone } from "@shared/schema";

export default function Shipping() {
  const { toast } = useToast();
  const [freeThreshold, setFreeThreshold] = useState("");
  const [defaultCost, setDefaultCost] = useState("");
  const [newZone, setNewZone] = useState({
    name: "",
    zipCodeStart: "",
    zipCodeEnd: "",
    shippingCost: "",
    estimatedDays: "7",
  });

  const { data: config } = useQuery<ShippingConfig>({
    queryKey: ["/api/shipping/config"],
  });

  const { data: zones = [] } = useQuery<ShippingZone[]>({
    queryKey: ["/api/shipping/zones"],
  });

  // Sync form fields with loaded config
  useEffect(() => {
    if (config) {
      if (config.freeShippingThreshold !== null && config.freeShippingThreshold !== undefined) {
        setFreeThreshold(config.freeShippingThreshold);
      }
      if (config.defaultShippingCost !== null && config.defaultShippingCost !== undefined) {
        setDefaultCost(config.defaultShippingCost);
      }
    }
  }, [config]);

  const saveConfig = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/shipping/config", data);
      if (!response.ok) throw new Error("Failed to save config");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping/config"] });
      toast({ title: "Configuração salva com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
    },
  });

  const createZone = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/shipping/zones", data);
      if (!response.ok) throw new Error("Failed to create zone");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping/zones"] });
      setNewZone({ name: "", zipCodeStart: "", zipCodeEnd: "", shippingCost: "", estimatedDays: "7" });
      toast({ title: "Zona de frete criada!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar zona", variant: "destructive" });
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/shipping/zones/${id}`);
      if (!response.ok) throw new Error("Failed to delete zone");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping/zones"] });
      toast({ title: "Zona removida!" });
    },
  });

  const handleSaveConfig = () => {
    saveConfig.mutate({
      freeShippingThreshold: freeThreshold || null,
      defaultShippingCost: defaultCost || "0",
    });
  };

  const handleCreateZone = () => {
    if (!newZone.name || !newZone.zipCodeStart || !newZone.zipCodeEnd || !newZone.shippingCost) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    createZone.mutate({
      name: newZone.name,
      zipCodeStart: newZone.zipCodeStart.replace(/\D/g, ""),
      zipCodeEnd: newZone.zipCodeEnd.replace(/\D/g, ""),
      shippingCost: newZone.shippingCost,
      estimatedDays: parseInt(newZone.estimatedDays) || 7,
      isActive: true,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Configuração de Frete</h1>
          <p className="text-muted-foreground">Configure opções de frete para sua loja</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Configure frete grátis e valor padrão para regiões não configuradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="freeThreshold">Frete Grátis Acima de (R$)</Label>
              <Input
                id="freeThreshold"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(e.target.value)}
                data-testid="input-free-threshold"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para não oferecer frete grátis
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultCost">Frete Padrão (R$)</Label>
              <Input
                id="defaultCost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={defaultCost}
                onChange={(e) => setDefaultCost(e.target.value)}
                data-testid="input-default-cost"
              />
              <p className="text-xs text-muted-foreground">
                Valor para CEPs não configurados nas zonas
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={saveConfig.isPending}
            data-testid="button-save-config"
          >
            {saveConfig.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zonas de Frete</CardTitle>
          <CardDescription>
            Configure valores de frete por faixa de CEP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-2">
                <Label htmlFor="zoneName">Nome da Zona</Label>
                <Input
                  id="zoneName"
                  placeholder="Ex: São Paulo Capital"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  data-testid="input-zone-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipStart">CEP Inicial</Label>
                <Input
                  id="zipStart"
                  placeholder="01000000"
                  maxLength={8}
                  value={newZone.zipCodeStart}
                  onChange={(e) => setNewZone({ ...newZone, zipCodeStart: e.target.value.replace(/\D/g, "") })}
                  data-testid="input-zip-start"
                />
                <p className="text-xs text-muted-foreground">
                  Apenas números, sem traço
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipEnd">CEP Final</Label>
                <Input
                  id="zipEnd"
                  placeholder="05999999"
                  maxLength={8}
                  value={newZone.zipCodeEnd}
                  onChange={(e) => setNewZone({ ...newZone, zipCodeEnd: e.target.value.replace(/\D/g, "") })}
                  data-testid="input-zip-end"
                />
                <p className="text-xs text-muted-foreground">
                  Apenas números, sem traço
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoneCost">Valor (R$)</Label>
                <Input
                  id="zoneCost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newZone.shippingCost}
                  onChange={(e) => setNewZone({ ...newZone, shippingCost: e.target.value })}
                  data-testid="input-zone-cost"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedDays">Prazo (dias)</Label>
                <Input
                  id="estimatedDays"
                  type="number"
                  placeholder="7"
                  value={newZone.estimatedDays}
                  onChange={(e) => setNewZone({ ...newZone, estimatedDays: e.target.value })}
                  data-testid="input-estimated-days"
                />
              </div>
            </div>

            <Button
              onClick={handleCreateZone}
              disabled={createZone.isPending}
              data-testid="button-add-zone"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createZone.isPending ? "Adicionando..." : "Adicionar Zona"}
            </Button>
          </div>

          {zones.length > 0 ? (
            <div className="space-y-3">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-4 border rounded-md" data-testid={`zone-${zone.id}`}>
                  <div className="flex-1 grid grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm font-medium">{zone.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        CEP: {zone.zipCodeStart} - {zone.zipCodeEnd}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">R$ {parseFloat(zone.shippingCost).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm">{zone.estimatedDays} dias</p>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteZone.mutate(zone.id)}
                        data-testid={`button-delete-zone-${zone.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma zona de frete configurada. Adicione uma acima.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
