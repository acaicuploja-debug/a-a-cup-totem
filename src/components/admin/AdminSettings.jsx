import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Palette, CreditCard, Gift, MessageCircle, Image as ImageIcon, Loader2, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings({ settings, primaryColor }) {
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState({});
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);
  
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.StoreSettings.update(settings.id, data);
      } else {
        return base44.entities.StoreSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['store-settings']);
      toast.success('Configurações salvas!');
    }
  });
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleImageUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      handleChange(field, result.file_url);
      toast.success('Imagem enviada!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    }
    setUploading(prev => ({ ...prev, [field]: false }));
  };
  
  const togglePaymentMethod = (method) => {
    const current = formData.payment_methods || ['pix', 'cartao'];
    if (current.includes(method)) {
      handleChange('payment_methods', current.filter(m => m !== method));
    } else {
      handleChange('payment_methods', [...current, method]);
    }
  };
  
  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          style={{ backgroundColor: primaryColor }}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>
      
      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 h-auto p-1">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span className="hidden md:inline">Loja</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden md:inline">Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden md:inline">Pagamento</span>
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span className="hidden md:inline">Fidelidade</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden md:inline">WhatsApp</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Loja</Label>
                <Input
                  value={formData.store_name || ''}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  placeholder="Açaí Cup"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Logotipo</Label>
                <div className="flex items-center gap-4">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload('logo_url', e)}
                    disabled={uploading.logo_url}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência do Totem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Principal</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primary_color || '#6B21A8'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border-0 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color || '#6B21A8'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.secondary_color || '#EC4899'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border-0 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color || '#EC4899'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Imagem de Fundo (Tela de Boas-vindas)</Label>
                <div className="flex items-center gap-4">
                  {formData.background_url ? (
                    <img src={formData.background_url} alt="Background" className="h-24 w-40 object-cover rounded-xl" />
                  ) : (
                    <div className="h-24 w-40 rounded-xl bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload('background_url', e)}
                    disabled={uploading.background_url}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Formas de Pagamento Habilitadas</Label>
                <div className="space-y-3">
                  {[
                    { id: 'pix', label: 'PIX', emoji: '📱' },
                    { id: 'cartao', label: 'Cartão (Maquininha)', emoji: '💳' },
                    { id: 'dinheiro', label: 'Dinheiro', emoji: '💵' }
                  ].map(method => (
                    <div key={method.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.emoji}</span>
                        <span className="font-medium">{method.label}</span>
                      </div>
                      <Switch
                        checked={(formData.payment_methods || ['pix', 'cartao']).includes(method.id)}
                        onCheckedChange={() => togglePaymentMethod(method.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-bold text-gray-900 mb-4">Configuração do PIX</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Chave</Label>
                    <Select 
                      value={formData.pix_key_type || ''}
                      onValueChange={(value) => handleChange('pix_key_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      value={formData.pix_key || ''}
                      onChange={(e) => handleChange('pix_key', e.target.value)}
                      placeholder="Sua chave PIX"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nome do Recebedor</Label>
                    <Input
                      value={formData.pix_receiver_name || ''}
                      onChange={(e) => handleChange('pix_receiver_name', e.target.value)}
                      placeholder="Nome exato cadastrado na chave PIX"
                    />
                    <p className="text-xs text-amber-600">
                      ⚠️ <strong>IMPORTANTE:</strong> Digite o nome EXATAMENTE como está cadastrado na chave PIX no seu banco. 
                      Qualquer diferença (maiúsculas, acentos, espaços) pode causar erro no pagamento.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Programa de Fidelidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quantidade de Pedidos para Ganhar Prêmio</Label>
                <Input
                  type="number"
                  value={formData.loyalty_target || 10}
                  onChange={(e) => handleChange('loyalty_target', parseInt(e.target.value) || 10)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição do Prêmio</Label>
                <Input
                  value={formData.loyalty_reward_description || ''}
                  onChange={(e) => handleChange('loyalty_reward_description', e.target.value)}
                  placeholder="Ex: Açaí 300ml grátis"
                />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>Como funciona:</strong> O cliente acumula pontos a cada pedido. 
                  Ao atingir a meta de {formData.loyalty_target || 10} pedidos, ganha o prêmio configurado.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Integração WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número do WhatsApp (com DDD)</Label>
                <Input
                  value={formData.whatsapp_number || ''}
                  onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                  placeholder="5511999999999"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Link do Google Avaliações</Label>
                <Input
                  value={formData.google_review_link || ''}
                  onChange={(e) => handleChange('google_review_link', e.target.value)}
                  placeholder="https://g.page/..."
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Pós-venda:</strong> Ao finalizar um pedido, o cliente receberá uma mensagem 
                  perguntando sobre a experiência. Se gostou, será direcionado ao Google Avaliações.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}