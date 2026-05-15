import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProductComplementEditor({ complements, onChange, primaryColor }) {
  const [uploadingFor, setUploadingFor] = useState(null);

  const handleImageUpload = async (groupIndex, itemIndex, file) => {
    const key = `${groupIndex}-${itemIndex}`;
    setUploadingFor(key);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateItem(groupIndex, itemIndex, 'image_url', file_url);
    setUploadingFor(null);
  };

  const addGroup = () => {
    onChange([
      ...complements,
      { name: '', required: false, min: 0, max: 10, items: [] }
    ]);
  };
  
  const updateGroup = (index, field, value) => {
    const updated = [...complements];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };
  
  const removeGroup = (index) => {
    onChange(complements.filter((_, i) => i !== index));
  };
  
  const addItem = (groupIndex) => {
    const updated = [...complements];
    updated[groupIndex].items = [
      ...updated[groupIndex].items,
      { name: '', price: 0 }
    ];
    onChange(updated);
  };
  
  const updateItem = (groupIndex, itemIndex, field, value) => {
    const updated = [...complements];
    updated[groupIndex].items[itemIndex] = {
      ...updated[groupIndex].items[itemIndex],
      [field]: value
    };
    onChange(updated);
  };
  
  const removeItem = (groupIndex, itemIndex) => {
    const updated = [...complements];
    updated[groupIndex].items = updated[groupIndex].items.filter((_, i) => i !== itemIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Complementos</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={addGroup}
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo Grupo
        </Button>
      </div>
      
      {complements.map((group, groupIndex) => (
        <Card key={groupIndex} className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Input
                value={group.name}
                onChange={(e) => updateGroup(groupIndex, 'name', e.target.value)}
                placeholder="Nome do grupo (ex: Caldas)"
                className="font-semibold max-w-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => removeGroup(groupIndex)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={group.required}
                  onCheckedChange={(checked) => updateGroup(groupIndex, 'required', checked)}
                />
                <Label className="text-sm">Obrigatório</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={group.max_value_mode || false}
                  onCheckedChange={(checked) => updateGroup(groupIndex, 'max_value_mode', checked)}
                />
                <Label className="text-sm">Apenas maior valor (não soma complementos)</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={group.allow_multiply || false}
                  onCheckedChange={(checked) => updateGroup(groupIndex, 'allow_multiply', checked)}
                />
                <Label className="text-sm">Permitir multiplicar adicionais (ex: 2x Morango)</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
              
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Mín:</Label>
                <Input
                  type="number"
                  min="0"
                  value={group.min}
                  onChange={(e) => updateGroup(groupIndex, 'min', parseInt(e.target.value) || 0)}
                  className="w-16"
                />
              </div>
              
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Máx:</Label>
                  <Input
                    type="number"
                    min="1"
                    value={group.max}
                    onChange={(e) => updateGroup(groupIndex, 'max', parseInt(e.target.value) || 1)}
                    className="w-16"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Itens</Label>
              {group.items.map((item, itemIndex) => {
                const uploadKey = `${groupIndex}-${itemIndex}`;
                const isUploading = uploadingFor === uploadKey;
                return (
                  <div key={itemIndex} className="flex items-center gap-2 flex-wrap">
                    <Switch
                      checked={item.active !== false}
                      onCheckedChange={(checked) => updateItem(groupIndex, itemIndex, 'active', checked)}
                    />
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(groupIndex, itemIndex, 'name', e.target.value)}
                      placeholder="Nome do item"
                      className="flex-1 min-w-[120px]"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(groupIndex, itemIndex, 'price', parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                    {/* Foto do item */}
                    <div className="flex items-center gap-1">
                      {item.image_url ? (
                        <div className="relative">
                          <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover border" />
                          <button
                            type="button"
                            onClick={() => updateItem(groupIndex, itemIndex, 'image_url', null)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                          {isUploading ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 text-gray-400" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files[0] && handleImageUpload(groupIndex, itemIndex, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => removeItem(groupIndex, itemIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(groupIndex)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Item
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {complements.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhum grupo de complementos. Clique em "Novo Grupo" para adicionar.
        </p>
      )}
    </div>
  );
}