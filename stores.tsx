import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Store as StoreIcon, Copy, Plus, ExternalLink, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Store } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function StoresManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreSlug, setNewStoreSlug] = useState("");
  const [newStoreDescription, setNewStoreDescription] = useState("");

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, slug, description }: { name: string; slug: string; description?: string }) => {
      return await apiRequest("POST", "/api/stores", { name, slug, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setCreateDialogOpen(false);
      setNewStoreName("");
      setNewStoreSlug("");
      setNewStoreDescription("");
      toast({
        title: "Loja criada!",
        description: "Sua nova loja foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar loja",
        description: error.message || "Ocorreu um erro ao criar a loja.",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ storeId, name, slug }: { storeId: string; name: string; slug: string }) => {
      return await apiRequest("POST", `/api/stores/${storeId}/duplicate`, { name, slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setDuplicateDialogOpen(false);
      setNewStoreName("");
      setNewStoreSlug("");
      toast({
        title: "Loja duplicada!",
        description: "A loja foi duplicada com sucesso com todos os produtos e configurações.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao duplicar loja",
        description: error.message || "Ocorreu um erro ao duplicar a loja.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (storeId: string) => {
      return await apiRequest("DELETE", `/api/stores/${storeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setDeleteDialogOpen(false);
      setSelectedStore(null);
      toast({
        title: "Loja excluída!",
        description: "A loja foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir loja",
        description: error.message || "Ocorreu um erro ao excluir a loja.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setNewStoreName("");
    setNewStoreSlug("");
    setNewStoreDescription("");
    setCreateDialogOpen(true);
  };

  const confirmCreate = () => {
    if (!newStoreName || !newStoreSlug) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o slug da nova loja.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: newStoreName,
      slug: newStoreSlug,
      description: newStoreDescription,
    });
  };

  const handleDuplicate = (store: Store) => {
    setSelectedStore(store);
    setNewStoreName(`${store.name} (Cópia)`);
    setNewStoreSlug(`${store.slug}-copia-${Date.now()}`);
    setDuplicateDialogOpen(true);
  };

  const confirmDuplicate = () => {
    if (!selectedStore || !newStoreName || !newStoreSlug) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o slug da nova loja.",
        variant: "destructive",
      });
      return;
    }

    duplicateMutation.mutate({
      storeId: selectedStore.id,
      name: newStoreName,
      slug: newStoreSlug,
    });
  };

  const handleDelete = (store: Store) => {
    setSelectedStore(store);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedStore) return;
    deleteMutation.mutate(selectedStore.id);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <StoreIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Minhas Lojas</h1>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-store">
          <Plus className="h-4 w-4 mr-2" />
          Nova Loja
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Card key={store.id} data-testid={`store-card-${store.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        {store.name}
                        {!store.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inativa
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm font-mono">
                        /store/{store.slug}
                      </CardDescription>
                    </div>
                  </div>
                  {store.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {store.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => setLocation(`/dashboard/customization/${store.id}`)}
                      data-testid={`button-customize-${store.id}`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Personalizar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(`/store/${store.slug}`, "_blank")}
                      data-testid={`button-view-${store.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleDuplicate(store)}
                      data-testid={`button-duplicate-${store.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDelete(store)}
                      data-testid={`button-delete-${store.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {stores.length === 0 && (
            <Card className="p-12 text-center">
              <StoreIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Nenhuma loja encontrada</h2>
              <p className="text-muted-foreground mb-6">
                Crie sua primeira loja para começar a vender online
              </p>
              <Button onClick={handleCreate} data-testid="button-create-first-store">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Loja
              </Button>
            </Card>
          )}
        </>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-store">
          <DialogHeader>
            <DialogTitle>Criar Nova Loja</DialogTitle>
            <DialogDescription>
              Crie uma nova loja online para vender seus produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-store-name">Nome da Loja</Label>
              <Input
                id="create-store-name"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Minha Loja"
                data-testid="input-create-name"
              />
            </div>
            <div>
              <Label htmlFor="create-store-slug">URL da Loja (slug)</Label>
              <Input
                id="create-store-slug"
                value={newStoreSlug}
                onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="minha-loja"
                data-testid="input-create-slug"
              />
              <p className="text-sm text-muted-foreground mt-1">
                A loja ficará em: /store/{newStoreSlug || "minha-loja"}
              </p>
            </div>
            <div>
              <Label htmlFor="create-store-description">Descrição (opcional)</Label>
              <Input
                id="create-store-description"
                value={newStoreDescription}
                onChange={(e) => setNewStoreDescription(e.target.value)}
                placeholder="Loja de produtos incríveis"
                data-testid="input-create-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmCreate}
              disabled={createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? "Criando..." : "Criar Loja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent data-testid="dialog-duplicate-store">
          <DialogHeader>
            <DialogTitle>Duplicar Loja</DialogTitle>
            <DialogDescription>
              Crie uma cópia da loja com todos os produtos, categorias, cupons e configurações.
              Você poderá personalizar o visual depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="store-name">Nome da Nova Loja</Label>
              <Input
                id="store-name"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Nome da loja"
                data-testid="input-duplicate-name"
              />
            </div>
            <div>
              <Label htmlFor="store-slug">URL da Loja (slug)</Label>
              <Input
                id="store-slug"
                value={newStoreSlug}
                onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="minha-loja-2"
                data-testid="input-duplicate-slug"
              />
              <p className="text-sm text-muted-foreground mt-1">
                A loja ficará em: /store/{newStoreSlug || "minha-loja-2"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialogOpen(false)}
              data-testid="button-cancel-duplicate"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDuplicate}
              disabled={duplicateMutation.isPending}
              data-testid="button-confirm-duplicate"
            >
              {duplicateMutation.isPending ? "Duplicando..." : "Duplicar Loja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-store">
          <DialogHeader>
            <DialogTitle>Excluir Loja</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a loja "{selectedStore?.name}"? 
              Esta ação não pode ser desfeita e todos os dados da loja (produtos, pedidos, cupons, etc.) serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir Loja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
