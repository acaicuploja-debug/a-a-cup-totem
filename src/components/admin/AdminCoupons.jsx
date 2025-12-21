import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Tag, Loader2, Percent, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCoupons({ settings, primaryColor }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '', discount_type: 'percentage', discount_value: 0,
    min_order_value: 0, max_uses: null, active: true
  });
  const queryClient = useQueryClient();
  
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => base44.entities.Coupon.list('-created_date')
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create({ ...data, used_count: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-coupons']);
      toast.success('Cupom criado!');
      handleCloseDialog();
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-coupons']);
      toast.success('Cupom atualizado!');
      handleCloseDialog();
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-coupons']);
      toast.success('Cupom removido!');
    }
  });
  
  const handleOpenDialog = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_value: coupon.min_order_value || 0,
        max_uses: coupon.max_uses || null,
        active: coupon.active !== false
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '', discount_type: 'percentage', discount_value: 0,
        min_order_value: 0, max_uses: null, active: true
      });
    }
    setShowDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCoupon(null);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error('Código é obrigatório');
      return;
    }
    
    const data = {
      ...formData,
      code: formData.code.toUpperCase(),
      discount_value: parseFloat(formData.discount_value) || 0,
      min_order_value: parseFloat(formData.min_order_value) || 0,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null
    };
    
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Cupons de Desconto</h1>
        <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cupom
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : coupons?.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Nenhum cupom criado</p>
            <Button onClick={() => handleOpenDialog()} style={{ backgroundColor: primaryColor }}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Cupom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {coupons?.map(coupon => {
            const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
            const isMaxedOut = coupon.max_uses && coupon.used_count >= coupon.max_uses;
            
            return (
              <Card key={coupon.id} className={!coupon.active || isExpired || isMaxedOut ? 'opacity-50' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}15` }}
                      >
                        <Tag className="w-7 h-7" style={{ color: primaryColor }} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">{coupon.code}</h3>
                          {!coupon.active && <Badge variant="secondary">Inativo</Badge>}
                          {isExpired && <Badge className="bg-red-100 text-red-800">Expirado</Badge>}
                          {isMaxedOut && <Badge className="bg-orange-100 text-orange-800">Esgotado</Badge>}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            {coupon.discount_type === 'percentage' ? (
                              <>
                                <Percent className="w-4 h-4" />
                                {coupon.discount_value}% de desconto
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4" />
                                R$ {coupon.discount_value.toFixed(2)} de desconto
                              </>
                            )}
                          </span>
                          {coupon.min_order_value > 0 && (
                            <span>Pedido mín: R$ {coupon.min_order_value.toFixed(2)}</span>
                          )}
                          {coupon.max_uses && (
                            <span>{coupon.used_count}/{coupon.max_uses} usos</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(coupon)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Remover este cupom?')) {
                            deleteMutation.mutate(coupon.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: DESCONTO10"
                maxLength={20}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <Select 
                value={formData.discount_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Valor do Desconto *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Valor Mínimo do Pedido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.min_order_value}
                onChange={(e) => setFormData(prev => ({ ...prev, min_order_value: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Máximo de Usos</Label>
              <Input
                type="number"
                value={formData.max_uses || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value || null }))}
                placeholder="Ilimitado"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ backgroundColor: primaryColor }}
              >
                {editingCoupon ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}