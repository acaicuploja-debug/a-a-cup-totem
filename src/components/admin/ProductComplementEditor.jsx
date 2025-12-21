import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function ProductComplementEditor({ complements, onChange, primaryColor }) {
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
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={group.required}
                  onCheckedChange={(checked) => updateGroup(groupIndex, 'required', checked)}
                />
                <Label className="text-sm">Obrigatório</Label>
              </div>
              
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
            
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Itens</Label>
              {group.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(groupIndex, itemIndex, 'name', e.target.value)}
                    placeholder="Nome do item"
                    className="flex-1"
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
              ))}
              
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