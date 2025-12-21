import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCategories({ settings, primaryColor }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', image_url: '', active: true, order: 0 });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => base44.entities.Category.list('order')
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-categories']);
      toast.success('Categoria criada!');
      handleCloseDialog();
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-categories']);
      toast.success('Categoria atualizada!');
      handleCloseDialog();
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-categories']);
      toast.success('Categoria removida!');
    }
  });
  
  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        image_url: category.image_url || '',
        active: category.active !== false,
        order: category.order || 0
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', image_url: '', active: true, order: (categories?.length || 0) + 1 });
    }
    setShowDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCategory(null);
    setFormData({ name: '', image_url: '', active: true, order: 0 });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: result.file_url }));
      toast.success('Imagem enviada!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    }
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
        <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : categories?.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <p className="text-gray-500 mb-4">Nenhuma categoria criada</p>
            <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories?.map((category, index) => (
            <Card key={category.id} className={!category.active ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-gray-400 cursor-move">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  {category.image_url ? (
                    <img 
                      src={category.image_url} 
                      alt={category.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <ImageIcon className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      Ordem: {category.order || index + 1}
                      {!category.active && ' • Inativa'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(category)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja remover esta categoria?')) {
                          deleteMutation.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Açaís"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="flex items-center gap-4">
                {formData.image_url ? (
                  <img 
                    src={formData.image_url} 
                    alt="Preview"
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-gray-500 mt-1">Enviando...</p>}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ backgroundColor: primaryColor }}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingCategory ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}