import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2, Copy, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import ProductComplementEditor from './ProductComplementEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const badgeOptions = [
  { value: 'promocao', label: 'Promoção' },
  { value: 'novo', label: 'Novo' },
  { value: 'mais_vendido', label: 'Mais Vendido' },
  { value: 'oferta', label: 'Oferta' }
];

export default function AdminProducts({ settings, primaryColor }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [productToDuplicate, setProductToDuplicate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '', description: '', image_url: '', price: 0, promo_price: null,
    cost_price: null, cost_percentage: null, price_per_kg: null, pdv_only: false, sold_by_weight: false,
    category_id: '', badges: [], complements: [], active: true, is_upsell: false
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingComplement, setUploadingComplement] = useState(false);
  const formDataRef = useRef(formData);
  const queryClient = useQueryClient();

  // Keep ref in sync - called immediately on every setFormData
  const setFormDataAndRef = (updater) => {
    setFormData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      formDataRef.current = next;
      return next;
    });
  };

  // Called directly by child after image upload - bypasses React render cycle
  const handleComplementImageUploaded = (groupIndex, itemIndex, file_url) => {
    const current = formDataRef.current;
    const updatedComplements = current.complements.map((group, gi) => {
      if (gi !== groupIndex) return group;
      return {
        ...group,
        items: group.items.map((item, ii) =>
          ii === itemIndex ? { ...item, image_url: file_url } : item
        )
      };
    });
    const next = { ...current, complements: updatedComplements };
    formDataRef.current = next;
    setFormData(next);
  };


  
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.filter({ is_upsell: false })
  });
  
  const products = useMemo(() => {
    if (!allProducts) return [];
    const filtered = selectedCategory === 'all' 
      ? allProducts 
      : allProducts.filter(p => p.category_id === selectedCategory);
    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allProducts, selectedCategory]);
  
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => base44.entities.Category.list('order')
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Produto criado!');
      handleCloseDialog();
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Produto atualizado!');
      handleCloseDialog();
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Produto removido!');
    }
  });
  
  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      const productData = {
        name: product.name,
        description: product.description || '',
        image_url: product.image_url || '',
        price: product.price,
        promo_price: product.promo_price || null,
        cost_price: product.cost_price || null,
        cost_percentage: product.cost_percentage || null,
        price_per_kg: product.price_per_kg || null,
        pdv_only: product.pdv_only || false,
        sold_by_weight: product.sold_by_weight || false,
        category_id: product.category_id,
        badges: product.badges || [],
        complements: product.complements || [],
        active: product.active !== false,
        is_upsell: false
      };
      formDataRef.current = productData;
      setFormData(productData);
    } else {
      setEditingProduct(null);
      const emptyData = {
        name: '', description: '', image_url: '', price: 0, promo_price: null,
        cost_price: null, cost_percentage: null, price_per_kg: null, pdv_only: false, sold_by_weight: false,
        category_id: '', badges: [], complements: [], active: true, is_upsell: false
      };
      formDataRef.current = emptyData;
      setFormData(emptyData);
    }
    setShowDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingProduct(null);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const current = formDataRef.current;
    if (!current.name.trim() || !current.category_id) {
      toast.error('Nome e categoria são obrigatórios');
      return;
    }
    
    const data = {
      ...current,
      price: parseFloat(current.price) || 0,
      promo_price: current.promo_price ? parseFloat(current.promo_price) : null
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
      setFormDataAndRef(prev => ({ ...prev, image_url: result.file_url }));
      toast.success('Imagem enviada!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    }
    setUploading(false);
  };
  
  const toggleBadge = (badge) => {
    setFormDataAndRef(prev => ({
      ...prev,
      badges: prev.badges.includes(badge)
        ? prev.badges.filter(b => b !== badge)
        : [...prev.badges, badge]
    }));
  };
  
  const getCategoryName = (categoryId) => {
    return categories?.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };
  
  const handleDuplicateProduct = (product) => {
    setProductToDuplicate(product);
    setShowDuplicateDialog(true);
  };
  
  const confirmDuplicate = () => {
    if (productToDuplicate) {
      const duplicated = {
        ...productToDuplicate,
        name: `${productToDuplicate.name} (Cópia)`,
        id: undefined,
        created_date: undefined,
        updated_date: undefined
      };
      delete duplicated.id;
      delete duplicated.created_date;
      delete duplicated.updated_date;
      createMutation.mutate(duplicated);
      setShowDuplicateDialog(false);
      setProductToDuplicate(null);
    }
  };
  
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(products);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order for all products
    items.forEach((item, index) => {
      if (item.order !== index) {
        updateMutation.mutate({ 
          id: item.id, 
          data: { ...item, order: index } 
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : products?.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <p className="text-gray-500 mb-4">Nenhum produto criado</p>
            <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      ) : selectedCategory !== 'all' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="products">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {products?.map((product, index) => (
                  <Draggable key={product.id} draggableId={product.id} index={index}>
                    {(provided) => (
                      <Card 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={!product.active ? 'opacity-50' : ''}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-5 h-5 text-gray-400" />
                            </div>
                            
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-20 h-20 rounded-xl object-cover"
                              />
                            ) : (
                              <div 
                                className="w-20 h-20 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${primaryColor}15` }}
                              >
                                <ImageIcon className="w-8 h-8" style={{ color: primaryColor }} />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-1 mb-1">
                                {product.badges?.map(badge => (
                                  <Badge key={badge} variant="secondary" className="text-xs">
                                    {badgeOptions.find(b => b.value === badge)?.label}
                                  </Badge>
                                ))}
                              </div>
                              <h3 className="font-bold text-gray-900">{product.name}</h3>
                              <p className="text-sm text-gray-500">{getCategoryName(product.category_id)}</p>
                            </div>
                            
                            <div className="text-right">
                              {product.promo_price ? (
                                <div>
                                  <span className="text-lg font-bold block" style={{ color: primaryColor }}>
                                    R$ {product.promo_price.toFixed(2)}
                                  </span>
                                  <span className="text-sm text-gray-400 line-through">
                                    R$ {product.price.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-lg font-bold" style={{ color: primaryColor }}>
                                  R$ {product.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button 
                                variant={product.active ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateMutation.mutate({ 
                                  id: product.id, 
                                  data: { ...product, active: !product.active } 
                                })}
                                style={product.active ? { backgroundColor: primaryColor } : {}}
                              >
                                {product.active ? 'Ativo' : 'Pausado'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleOpenDialog(product)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDuplicateProduct(product)}
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products?.map(product => (
            <Card key={product.id} className={!product.active ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full aspect-square rounded-xl object-cover mb-4"
                  />
                ) : (
                  <div 
                    className="w-full aspect-square rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <ImageIcon className="w-12 h-12" style={{ color: primaryColor }} />
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {product.badges?.map(badge => (
                    <Badge key={badge} variant="secondary" className="text-xs">
                      {badgeOptions.find(b => b.value === badge)?.label}
                    </Badge>
                  ))}
                </div>
                
                <h3 className="font-bold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{getCategoryName(product.category_id)}</p>
                
                <div className="flex items-baseline gap-2 mb-4">
                  {product.promo_price ? (
                    <>
                      <span className="text-lg font-bold" style={{ color: primaryColor }}>
                        R$ {product.promo_price.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        R$ {product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      R$ {product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant={product.active ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateMutation.mutate({ 
                      id: product.id, 
                      data: { ...product, active: !product.active } 
                    })}
                    style={product.active ? { backgroundColor: primaryColor } : {}}
                  >
                    {product.active ? 'Ativo' : 'Pausado'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(product)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDuplicateProduct(product)}
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
          ))}
        </div>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormDataAndRef(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do produto"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select 
                  value={formData.category_id}
                  onValueChange={(value) => setFormDataAndRef(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormDataAndRef(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do produto"
                rows={2}
              />
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormDataAndRef(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Preço Promocional (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.promo_price || ''}
                  onChange={(e) => setFormDataAndRef(prev => ({ ...prev, promo_price: e.target.value || null }))}
                  placeholder="Deixe vazio se não houver"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.sold_by_weight ? (
                <div className="space-y-2">
                  <Label>Custo (% do valor total na pesagem)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.cost_percentage || ''}
                    onChange={(e) => setFormDataAndRef(prev => ({ ...prev, cost_percentage: e.target.value || null }))}
                    placeholder="Ex: 30 (para 30%)"
                  />
                  <p className="text-xs text-gray-500">
                    Ex: Se custo é 30% e vender R$ 14,05, custo será R$ 4,22
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Preço de Custo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost_price || ''}
                    onChange={(e) => setFormDataAndRef(prev => ({ ...prev, cost_price: e.target.value || null }))}
                    placeholder="0.00"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Preço por Kg (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price_per_kg || ''}
                  onChange={(e) => setFormDataAndRef(prev => ({ ...prev, price_per_kg: e.target.value || null }))}
                  placeholder="Para produtos vendidos por peso"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.pdv_only || false}
                  onCheckedChange={(checked) => setFormDataAndRef(prev => ({ ...prev, pdv_only: checked }))}
                  id="pdv-only"
                />
                <Label htmlFor="pdv-only" className="cursor-pointer">
                  Produto exclusivo do PDV (não aparece no totem)
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.sold_by_weight || false}
                  onCheckedChange={(checked) => setFormDataAndRef(prev => ({ ...prev, sold_by_weight: checked }))}
                  id="sold-by-weight"
                />
                <Label htmlFor="sold-by-weight" className="cursor-pointer">
                  Produto vendido por quilo (usar balança)
                </Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Selos</Label>
              <div className="flex flex-wrap gap-2">
                {badgeOptions.map(badge => (
                  <Button
                    key={badge.value}
                    type="button"
                    variant={formData.badges.includes(badge.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleBadge(badge.value)}
                    style={formData.badges.includes(badge.value) ? { backgroundColor: primaryColor } : {}}
                  >
                    {badge.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <ProductComplementEditor
              complements={formDataRef.current.complements}
              onChange={(complements) => {
                const next = { ...formDataRef.current, complements };
                formDataRef.current = next;
                setFormData(next);
              }}
              onUploadingChange={setUploadingComplement}
              onImageUploaded={handleComplementImageUploaded}
              primaryColor={primaryColor}
            />
            
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormDataAndRef(prev => ({ ...prev, active: checked }))}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploading || uploadingComplement} style={{ backgroundColor: primaryColor }}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProduct ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Duplicate Confirmation Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Produto</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Deseja criar uma cópia de "{productToDuplicate?.name}"?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDuplicate} style={{ backgroundColor: primaryColor }}>
              Sim, Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}