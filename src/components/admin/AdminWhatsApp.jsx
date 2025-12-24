import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Plus, Trash2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const triggerLabels = {
  order_finished: 'Após finalizar pedido',
  inactive_customer: 'Cliente inativo',
  birthday: 'Aniversário do cliente',
  custom: 'Personalizado'
};

export default function AdminWhatsApp({ settings, primaryColor }) {
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    whatsapp_api_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_automations: []
  });

  React.useEffect(() => {
    if (settings) {
      setFormData({
        whatsapp_api_token: settings.whatsapp_api_token || '',
        whatsapp_phone_number_id: settings.whatsapp_phone_number_id || '',
        whatsapp_automations: settings.whatsapp_automations || []
      });
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const settingsList = await base44.entities.StoreSettings.list();
      if (settingsList.length > 0) {
        return await base44.entities.StoreSettings.update(settingsList[0].id, data);
      }
      return await base44.entities.StoreSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['store-settings']);
      toast.success('Configurações salvas!');
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const handleAddAutomation = () => {
    setEditingAutomation({
      id: Date.now().toString(),
      name: '',
      trigger: 'order_finished',
      trigger_days: 7,
      message: '',
      active: true
    });
    setShowDialog(true);
  };

  const handleEditAutomation = (automation) => {
    setEditingAutomation(automation);
    setShowDialog(true);
  };

  const handleSaveAutomation = () => {
    if (!editingAutomation.name || !editingAutomation.message) {
      toast.error('Preencha nome e mensagem');
      return;
    }

    const existing = formData.whatsapp_automations.find(a => a.id === editingAutomation.id);
    let newAutomations;

    if (existing) {
      newAutomations = formData.whatsapp_automations.map(a => 
        a.id === editingAutomation.id ? editingAutomation : a
      );
    } else {
      newAutomations = [...formData.whatsapp_automations, editingAutomation];
    }

    setFormData({ ...formData, whatsapp_automations: newAutomations });
    setShowDialog(false);
    setEditingAutomation(null);
    toast.success('Automação salva! Clique em "Salvar Configurações" para aplicar.');
  };

  const handleDeleteAutomation = (id) => {
    setFormData({
      ...formData,
      whatsapp_automations: formData.whatsapp_automations.filter(a => a.id !== id)
    });
    toast.success('Automação removida! Clique em "Salvar Configurações" para aplicar.');
  };

  const handleToggleAutomation = (id) => {
    setFormData({
      ...formData,
      whatsapp_automations: formData.whatsapp_automations.map(a =>
        a.id === id ? { ...a, active: !a.active } : a
      )
    });
  };

  const isConfigured = formData.whatsapp_api_token && formData.whatsapp_phone_number_id;

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-gray-200 rounded-full"
          style={{ borderTopColor: primaryColor }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Propagandas no WhatsApp</h1>
          <p className="text-gray-500 mt-1">Configure mensagens automáticas para seus clientes</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          style={{ backgroundColor: primaryColor }}
          className="text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>

      {/* Configuração API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Configuração da API do WhatsApp
          </CardTitle>
          <CardDescription>
            Configure sua conta WhatsApp Business API da Meta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Como configurar:</p>
                <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                  <li>Acesse <a href="https://developers.facebook.com/apps/" target="_blank" className="underline">developers.facebook.com/apps/</a></li>
                  <li>Crie um app ou use existente → Adicione produto "WhatsApp"</li>
                  <li>Configure um número de telefone</li>
                  <li>Copie o Token de Acesso e Phone Number ID abaixo</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="whatsapp_api_token">Token de Acesso da API</Label>
              <Input
                id="whatsapp_api_token"
                type="password"
                placeholder="EAAxxxxxxxxxxxxxxxxxxxx"
                value={formData.whatsapp_api_token}
                onChange={(e) => setFormData({ ...formData, whatsapp_api_token: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="whatsapp_phone_number_id">Phone Number ID</Label>
              <Input
                id="whatsapp_phone_number_id"
                placeholder="123456789012345"
                value={formData.whatsapp_phone_number_id}
                onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
              />
            </div>
          </div>

          {isConfigured && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">API configurada corretamente!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mensagens Automáticas</CardTitle>
              <CardDescription>
                Configure quando e o que enviar automaticamente
              </CardDescription>
            </div>
            <Button
              onClick={handleAddAutomation}
              variant="outline"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.whatsapp_automations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma automação configurada</p>
              <p className="text-sm">Clique em "Nova Automação" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.whatsapp_automations.map(automation => (
                <div 
                  key={automation.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{automation.name}</h3>
                        <Switch
                          checked={automation.active}
                          onCheckedChange={() => handleToggleAutomation(automation.id)}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        <strong>Gatilho:</strong> {triggerLabels[automation.trigger]}
                        {automation.trigger === 'inactive_customer' && ` (${automation.trigger_days} dias)`}
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {automation.message}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAutomation(automation)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteAutomation(automation.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Automação */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAutomation?.name ? 'Editar' : 'Nova'} Automação
            </DialogTitle>
          </DialogHeader>

          {editingAutomation && (
            <div className="space-y-4">
              <div>
                <Label>Nome da Automação</Label>
                <Input
                  placeholder="Ex: Boas vindas, Promoção semanal..."
                  value={editingAutomation.name}
                  onChange={(e) => setEditingAutomation({ ...editingAutomation, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Quando enviar</Label>
                <Select
                  value={editingAutomation.trigger}
                  onValueChange={(value) => setEditingAutomation({ ...editingAutomation, trigger: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_finished">Após finalizar pedido</SelectItem>
                    <SelectItem value="inactive_customer">Cliente inativo</SelectItem>
                    <SelectItem value="birthday">Aniversário do cliente</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingAutomation.trigger === 'inactive_customer' && (
                <div>
                  <Label>Dias sem pedir</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingAutomation.trigger_days}
                    onChange={(e) => setEditingAutomation({ 
                      ...editingAutomation, 
                      trigger_days: parseInt(e.target.value) 
                    })}
                  />
                </div>
              )}

              <div>
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Digite a mensagem que será enviada..."
                  rows={6}
                  value={editingAutomation.message}
                  onChange={(e) => setEditingAutomation({ ...editingAutomation, message: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dica: Use {'{nome}'} para o nome do cliente
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingAutomation.active}
                  onCheckedChange={(checked) => setEditingAutomation({ ...editingAutomation, active: checked })}
                />
                <Label>Automação ativa</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingAutomation(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAutomation}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                >
                  Salvar Automação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}