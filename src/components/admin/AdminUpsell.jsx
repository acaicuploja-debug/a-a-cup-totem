import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2, Sparkles, Copy, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ProductComplementEditor from './ProductComplementEditor';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function AdminUpsell({ settings, primaryColor }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', image_url: '', price: 0, promo_price: 0, cost_price: 0, active: true, badges: [], complements: []
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-upsell'],
    queryFn: async () => {
      const result = await base44.entities.Product.filter({ is_upsell: true });
      return result.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create({ ...data, is_upsell: true, category_id: 'upsell' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-upsell']);
      toast.success('Produto de upsell criado!');
      handleCloseDialog();
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-upsell']);
      toast.success('Produto atualizado!');
      handleCloseDialog();
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-upsell']);
      toast.success('Produto removido!');
    }
  });
  
  const badgeOptions = [
    { value: 'promocao', label: '🔥 Promoção' },
    { value: 'novo', label: '✨ Novo' },
    { value: 'mais_vendido', label: '⭐ Mais Vendido' },
    { value: 'oferta', label: '💰 Oferta' },
    { value: 'leve_mais_pague_menos', label: '🎁 Leve Mais Pague Menos' }
  ];
  
  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        image_url: product.image_url || '',
        price: product.price,
        promo_price: product.promo_price || 0,
        cost_price: product.cost_price || 0,
        active: product.active !== false,
        badges: product.badges || [],
        complements: product.complements || []
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', image_url: '', price: 0, promo_price: 0, cost_price: 0, active: true, badges: [], complements: [] });
    }
    setShowDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingProduct(null);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    const data = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      promo_price: parseFloat(formData.promo_price) || 0,
      cost_price: parseFloat(formData.cost_price) || 0
    };
    
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
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

  const handleDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const items = Array.from(products);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    queryClient.setQueryData(['admin-upsell'], items);

    try {
      await Promise.all(
        items.map((item, index) =>
          base44.entities.Product.update(item.id, { order: index })
        )
      );
      toast.success('Ordem atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar ordem');
      queryClient.invalidateQueries(['admin-upsell']);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos de Upsell</h1>
          <p className="text-gray-500 mt-1">
            Produtos sugeridos após adicionar itens ao carrinho
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Upsell
        </Button>
      </div>
      
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <p className="text-amber-800">
            Produtos de upsell são exibidos apenas na tela de venda sugestiva, não aparecem no cardápio.
          </p>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : products?.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Nenhum produto de upsell criado</p>
            <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Upsell
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="upsell-products">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {products?.map((product, index) => (
                  <Draggable key={product.id} draggableId={product.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${!product.active ? 'opacity-50' : ''} ${
                          snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                        } transition-all`}
                      >
                        <CardContent className="p-4">
                          <div
                            {...provided.dragHandleProps}
                            className="flex items-center justify-center mb-2 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-5 h-5 text-gray-400" />
                          </div>

                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full aspect-square rounded-xl object-cover mb-4" />
                          ) : (
                            <div className="w-full aspect-square rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                              <ImageIcon className="w-12 h-12" style={{ color: primaryColor }} />
                            </div>
                          )}
                          
                          <h3 className="font-bold text-gray-900">{product.name}</h3>
                          {product.description && <p className="text-sm text-gray-500 mb-2">{product.description}</p>}
                          
                          <div className="mb-4">
                            {product.promo_price && product.promo_price < product.price ? (
                              <div className="flex items-baseline gap-2">
                                <p className="text-lg font-bold" style={{ color: primaryColor }}>
                                  R$ {product.promo_price.toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-400 line-through">
                                  R$ {product.price.toFixed(2)}
                                </p>
                              </div>
                            ) : (
                              <p className="text-lg font-bold" style={{ color: primaryColor }}>
                                R$ {product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(product)}>
                              <Pencil className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (confirm('Duplicar este produto?')) {
                                  const duplicated = {
                                    ...product,
                                    name: `${product.name} (Cópia)`,
                                    id: undefined,
                                    created_date: undefined,
                                    updated_date: undefined
                                  };
                                  delete duplicated.id;
                                  delete duplicated.created_date;
                                  delete duplicated.updated_date;
                                  createMutation.mutate(duplicated);
                                }
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => {
                                if (confirm('Remover este produto?')) {
                                  deleteMutation.mutate(product.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Upsell' : 'Novo Upsell'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>
            
            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="flex items-center gap-4">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} />
              </div>
              
              <div className="space-y-2">
                <Label>Preço Promocional (R$)</Label>
                <Input type="number" step="0.01" value={formData.promo_price} onChange={(e) => setFormData(prev => ({ ...prev, promo_price: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Preço de Custo (R$)</Label>
                <Input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Selos de Destaque</Label>
              <div className="grid grid-cols-2 gap-2">
                {badgeOptions.map(badge => (
                  <div key={badge.value} className="flex items-center space-x-2 p-2 border rounded-lg">
                    <Checkbox
                      checked={formData.badges?.includes(badge.value)}
                      onCheckedChange={(checked) => {
                        const current = formData.badges || [];
                        setFormData(prev => ({
                          ...prev,
                          badges: checked 
                            ? [...current, badge.value]
                            : current.filter(b => b !== badge.value)
                        }));
                      }}
                    />
                    <label className="text-sm">{badge.label}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <ProductComplementEditor
              complements={formData.complements || []}
              onChange={(complements) => setFormData(prev => ({ ...prev, complements }))}
            />
            
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={formData.active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))} />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} style={{ backgroundColor: primaryColor }}>
                {editingProduct ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}