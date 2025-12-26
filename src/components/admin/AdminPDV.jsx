import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Users, Scale, Plus, Minus, X, CreditCard, QrCode, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import qz from 'qz-tray';

export default function AdminPDV({ settings, primaryColor, onClose }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [weightProduct, setWeightProduct] = useState(null);
  const [weight, setWeight] = useState('');
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['pdv-products'],
    queryFn: async () => {
      const all = await base44.entities.Product.list();
      return all.filter(p => p.pdv_only && p.active);
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const all = await base44.entities.Category.list();
      return all.filter(c => c.pdv_only && c.active);
    }
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.Mesa.list()
  });

  // Initialize tables if empty
  React.useEffect(() => {
    if (tables.length === 0) {
      const initTables = async () => {
        for (let i = 1; i <= 6; i++) {
          await base44.entities.Mesa.create({ number: i, status: 'livre' });
        }
        queryClient.invalidateQueries(['tables']);
      };
      initTables();
    }
  }, [tables]);

  const productsByCategory = useMemo(() => {
    const grouped = {};
    products.forEach(product => {
      if (!grouped[product.category_id]) {
        grouped[product.category_id] = [];
      }
      grouped[product.category_id].push(product);
    });
    return grouped;
  }, [products]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const handleAddToCart = async (product) => {
    if (product.sold_by_weight) {
      setWeightProduct(product);
      setShowWeightDialog(true);
      return;
    }

    const existing = cart.find(item => item.product_id === product.id);
    let newCart;
    
    if (existing) {
      newCart = cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      );
    } else {
      newCart = [...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.promo_price || product.price,
        total: product.promo_price || product.price,
        sold_by_weight: false
      }];
    }
    
    setCart(newCart);
    
    // Salvar na mesa se houver mesa selecionada
    if (selectedTable && selectedTable.id) {
      const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);
      await base44.entities.Mesa.update(selectedTable.id, {
        status: 'ocupada',
        items: newCart,
        total: newTotal
      });
      queryClient.invalidateQueries(['tables']);
    }
  };

  const handleAddWeight = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Digite um peso válido');
      return;
    }

    const weightKg = parseFloat(weight);
    const pricePerKg = weightProduct.price_per_kg || weightProduct.price;
    const total = weightKg * pricePerKg;
    
    // Calcular custo baseado em porcentagem para produtos por peso
    let itemCost = 0;
    if (weightProduct.cost_percentage) {
      itemCost = total * (weightProduct.cost_percentage / 100);
    } else if (weightProduct.cost_price) {
      itemCost = weightProduct.cost_price * weightKg;
    }

    const newCart = [...cart, {
      product_id: weightProduct.id,
      product_name: weightProduct.name,
      quantity: 1,
      weight: weightKg,
      unit_price: total,
      total: total,
      cost_price: itemCost,
      sold_by_weight: true
    }];

    setCart(newCart);

    // Salvar na mesa se houver mesa selecionada
    if (selectedTable && selectedTable.id) {
      const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);
      await base44.entities.Mesa.update(selectedTable.id, {
        status: 'ocupada',
        items: newCart,
        total: newTotal
      });
      queryClient.invalidateQueries(['tables']);
    }

    setShowWeightDialog(false);
    setWeightProduct(null);
    setWeight('');
    toast.success(`${weightKg}kg adicionado!`);
  };

  const handleUpdateQuantity = async (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].total = newCart[index].quantity * newCart[index].unit_price;
    }
    
    setCart(newCart);

    // Salvar na mesa se houver mesa selecionada
    if (selectedTable && selectedTable.id) {
      const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);
      await base44.entities.Mesa.update(selectedTable.id, {
        status: newCart.length > 0 ? 'ocupada' : 'livre',
        items: newCart,
        total: newTotal
      });
      queryClient.invalidateQueries(['tables']);
    }
  };

  const handleRemoveItem = async (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);

    // Salvar na mesa se houver mesa selecionada
    if (selectedTable && selectedTable.id) {
      const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);
      await base44.entities.Mesa.update(selectedTable.id, {
        status: newCart.length > 0 ? 'ocupada' : 'livre',
        items: newCart,
        total: newTotal
      });
      queryClient.invalidateQueries(['tables']);
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethod) => {
      const now = new Date();
      const brasiliaTime = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const orders = await base44.entities.Order.list('-order_number', 1);
      const nextNumber = orders.length > 0 ? (orders[0].order_number || 0) + 1 : 1;

      const order = await base44.entities.Order.create({
        order_number: nextNumber,
        customer_name: selectedTable ? `Mesa ${selectedTable.number}` : 'Balcão',
        customer_phone: 'PDV',
        items: cart,
        subtotal: cartTotal,
        total: cartTotal,
        consumption_type: 'local',
        payment_method: paymentMethod,
        status: 'finalizado',
        order_datetime: brasiliaTime
      });

      if (selectedTable) {
        await base44.entities.Mesa.update(selectedTable.id, {
          status: 'livre',
          order_id: null,
          items: [],
          total: 0
        });
      }

      return order;
    },
    onSuccess: async (order) => {
      queryClient.invalidateQueries(['tables']);
      queryClient.invalidateQueries(['admin-orders-manager']);
      queryClient.invalidateQueries(['admin-orders']);
      
      // Impressão automática
      await handlePrintOrder(order);
      
      toast.success('Venda finalizada!');
      setCart([]);
      setSelectedTable(null);
      setShowPayment(false);
    },
    onError: (error) => {
      console.error('Erro ao finalizar venda:', error);
      toast.error('Erro ao finalizar venda: ' + error.message);
    }
  });

  const handlePrintOrder = async (order) => {
    try {
      const printContent = `
================================
${settings?.store_name || 'Loja'}
PEDIDO #${String(order.order_number || '').padStart(3, '0')}
${order.order_datetime || new Date().toLocaleString('pt-BR')}
================================

>>> VENDA BALCAO - PDV <<<

--------------------------------
Itens:
${order.items?.map(item => `
${item.quantity}x ${item.product_name}${item.weight ? ` (${item.weight}kg)` : ''}
R$ ${item.total.toFixed(2)}`).join('\n') || ''}

================================
TOTAL: R$ ${order.total.toFixed(2)}
================================

Pagamento: ${
  order.payment_method === 'pix' ? 'PIX' :
  order.payment_method === 'cartao' ? 'Cartao' :
  order.payment_method === 'dinheiro' ? 'Dinheiro' : 'Cartao'
}

--------------------------------
Obrigado pela preferencia!
================================
`;

      // Verificar QZ Tray
      if (typeof qz !== 'undefined' && qz.websocket.isActive()) {
        const defaultPrinter = settings?.default_printer;
        const printer = defaultPrinter || (await qz.printers.find())[0];

        const config = qz.configs.create(printer);
        const data = [{
          type: 'raw',
          format: 'plain',
          data: printContent
        }];

        await qz.print(config, data);
        toast.success('Pedido impresso!');
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
    }
  };

  const handleSelectTable = (table) => {
    // Carregar os itens da mesa selecionada
    setCart(table.items || []);
    setSelectedTable(table);
  };

  const handleCheckout = (paymentMethod) => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio!');
      return;
    }
    createOrderMutation.mutate(paymentMethod);
  };

  // Atalho ENTER para abrir pagamento (mas não finalizar)
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && cart.length > 0 && !showPayment && !showWeightDialog) {
        e.preventDefault();
        setShowPayment(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, showPayment, showWeightDialog]);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>PDV - Loja Física</h1>
          <p className="text-sm text-gray-500">
            {selectedTable ? `Mesa ${selectedTable.number}` : 'Venda Rápida'}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left: Tables */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Mesas
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => {
              const tableNum = i + 1;
              const table = tables.find(t => t.number === tableNum);
              const isOccupied = table?.status === 'ocupada';
              const isSelected = selectedTable?.number === tableNum;

              return (
                <button
                  key={tableNum}
                  onClick={() => handleSelectTable(table || { number: tableNum, status: 'livre' })}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50'
                      : isOccupied
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl font-bold">{tableNum}</span>
                  <Badge
                    className={isOccupied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                  >
                    {isOccupied ? 'Ocupada' : 'Livre'}
                  </Badge>
                  {isOccupied && (
                    <span className="text-xs text-gray-600">
                      R$ {table.total?.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <Button
            onClick={() => {
              setSelectedTable(null);
              setCart([]);
            }}
            variant={!selectedTable ? 'default' : 'outline'}
            className="w-full"
            style={!selectedTable ? { backgroundColor: primaryColor } : {}}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Venda Rápida (Balcão)
          </Button>
        </div>

        {/* Middle: Products */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Produtos PDV</h3>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {categories.map(category => {
              const categoryProducts = productsByCategory[category.id];
              if (!categoryProducts || categoryProducts.length === 0) return null;

              return (
                <div key={category.id}>
                  <h4 className="font-medium text-gray-700 mb-2">{category.name}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        className="p-3 bg-white border rounded-lg hover:border-purple-400 transition-all text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            {product.sold_by_weight ? (
                              <div className="flex items-center gap-1 mt-1">
                                <Scale className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  R$ {(product.price_per_kg || product.price).toFixed(2)}/kg
                                </span>
                              </div>
                            ) : (
                              <p className="text-sm font-bold" style={{ color: primaryColor }}>
                                R$ {(product.promo_price || product.price).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cart */}
        <div>
          <Card className="p-4 sticky top-24">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Carrinho vazio</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product_name}</p>
                        {item.sold_by_weight && (
                          <p className="text-xs text-gray-500">
                            <Scale className="w-3 h-3 inline mr-1" />
                            {item.weight}kg
                          </p>
                        )}
                        <p className="text-xs text-gray-600">R$ {item.total.toFixed(2)}</p>
                      </div>
                      {!item.sold_by_weight && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateQuantity(index, -1)}
                            className="w-6 h-6 rounded bg-white border flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(index, 1)}
                            className="w-6 h-6 rounded bg-white border flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl" style={{ color: primaryColor }}>
                      R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  Finalizar Venda
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Weight Dialog */}
      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informar Peso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-2">{weightProduct?.name}</p>
              <p className="text-sm text-gray-500">
                R$ {(weightProduct?.price_per_kg || weightProduct?.price)?.toFixed(2)}/kg
              </p>
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.001"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWeight();
                  }
                }}
                placeholder="0.000"
                autoFocus
              />
            </div>
            {weight && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Total:</p>
                <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                  R$ {(parseFloat(weight) * (weightProduct?.price_per_kg || weightProduct?.price || 0)).toFixed(2)}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowWeightDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleAddWeight} className="flex-1" style={{ backgroundColor: primaryColor }}>
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {settings?.payment_methods?.includes('pix') && (
              <button
                onClick={() => handleCheckout('pix')}
                className="w-full flex items-center gap-4 p-4 bg-white border-2 rounded-xl hover:border-green-400 transition-all"
              >
                <QrCode className="w-8 h-8 text-green-600" />
                <div className="flex-1 text-left">
                  <p className="font-bold">PIX</p>
                  <p className="text-sm text-gray-500">QR Code</p>
                </div>
              </button>
            )}

            {settings?.payment_methods?.includes('cartao') && (
              <button
                onClick={() => handleCheckout('cartao')}
                className="w-full flex items-center gap-4 p-4 bg-white border-2 rounded-xl hover:border-purple-400 transition-all"
              >
                <CreditCard className="w-8 h-8 text-purple-600" />
                <div className="flex-1 text-left">
                  <p className="font-bold">Cartão</p>
                  <p className="text-sm text-gray-500">Débito ou Crédito</p>
                </div>
              </button>
            )}

            {settings?.payment_methods?.includes('dinheiro') && (
              <button
                onClick={() => handleCheckout('dinheiro')}
                className="w-full flex items-center gap-4 p-4 bg-white border-2 rounded-xl hover:border-amber-400 transition-all"
              >
                <Banknote className="w-8 h-8 text-amber-600" />
                <div className="flex-1 text-left">
                  <p className="font-bold">Dinheiro</p>
                  <p className="text-sm text-gray-500">Espécie</p>
                </div>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}