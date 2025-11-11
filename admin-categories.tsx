import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCategorySchema, type Category } from "@shared/schema";
import { z } from "zod";

const formSchema = insertCategorySchema.extend({
  slug: z.string().optional(),
});

export default function AdminCategories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const createCategory = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
      };

      if (editingCategory) {
        const response = await apiRequest("PATCH", `/api/categories/${editingCategory.id}`, payload);
        if (!response.ok) {
          const error = await response.json();
          throw error;
        }
      } else {
        const response = await apiRequest("POST", "/api/categories", payload);
        if (!response.ok) {
          const error = await response.json();
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: editingCategory ? "Categoria atualizada" : "Categoria criada",
        description: editingCategory
          ? "A categoria foi atualizada com sucesso."
          : "Nova categoria adicionada.",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar categoria",
        description: error.message || "Ocorreu um erro ao salvar a categoria.",
        variant: "destructive",
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      await apiRequest("DELETE", `/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria excluída",
        description: "A categoria foi removida com sucesso.",
      });
    },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
    });
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createCategory.mutate(data);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Categorias</h1>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Categoria
        </Button>
      </div>

      {!categories || categories.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma categoria cadastrada</h3>
          <p className="text-muted-foreground mb-6">
            Organize seus produtos criando categorias
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-category">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Categoria
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="p-6 hover-elevate" data-testid={`category-${category.id}`}>
              <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {category.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(category)}
                  data-testid={`button-edit-category-${category.id}`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
                      deleteCategory.mutate(category.id);
                    }
                  }}
                  data-testid={`button-delete-category-${category.id}`}
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
              {editingCategory ? "Editar Categoria" : "Adicionar Categoria"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Eletrônicos" data-testid="input-category-name" />
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
                    <FormLabel>Slug (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: eletronicos" data-testid="input-category-slug" />
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
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Descrição da categoria" data-testid="input-category-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-category">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCategory.isPending} data-testid="button-save-category">
                  {createCategory.isPending ? "Salvando..." : editingCategory ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
