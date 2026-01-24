import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const ESCPOS = {
  INIT: ESC + '@',
  LINE_FEED: '\n',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  CUT: GS + 'V' + '\x00',
  TEXT_NORMAL: ESC + '!' + '\x00',
  TEXT_2X: ESC + '!' + '\x30',
  TEXT_LARGE: ESC + '!' + '\x10',
  BEEP: ESC + 'B' + '\x02' + '\x02'
};

let printerDevice = null;
let printerPort = null;

export default function WebUSBPrinter({ settings, primaryColor }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [printerName, setPrinterName] = useState('');

  useEffect(() => {
    // Check if there's a previously connected printer
    checkPreviousConnection();
  }, []);

  const checkPreviousConnection = async () => {
    if (!navigator.usb) {
      console.log('WebUSB não suportado neste navegador');
      return;
    }

    try {
      const devices = await navigator.usb.getDevices();
      if (devices.length > 0) {
        printerDevice = devices[0];
        setPrinterName(printerDevice.productName || 'Impressora USB');
        setConnected(true);
        console.log('✅ Impressora reconectada:', printerDevice.productName);
      }
    } catch (error) {
      console.log('Erro ao verificar conexão anterior:', error);
    }
  };

  const connectPrinter = async () => {
    if (!navigator.usb) {
      toast.error('WebUSB não suportado neste navegador. Use Chrome ou Edge.');
      return;
    }

    setConnecting(true);
    try {
      // Request ANY USB device (no filters)
      console.log('🔍 Buscando impressoras USB...');
      const device = await navigator.usb.requestDevice({
        filters: [] // Sem filtros - mostra TODAS as impressoras USB
      });

      await device.open();
      
      // Select configuration
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim interface
      await device.claimInterface(0);

      printerDevice = device;
      const name = device.productName || device.manufacturerName || 'Impressora USB';
      setPrinterName(name);
      setConnected(true);
      
      console.log('✅ Impressora conectada:', {
        nome: name,
        vendorId: device.vendorId.toString(16),
        productId: device.productId.toString(16)
      });
      
      toast.success(`Impressora "${name}" conectada!`);
    } catch (error) {
      console.error('❌ Erro ao conectar impressora:', error);
      
      if (error.name === 'NotFoundError') {
        toast.error('Nenhuma impressora USB selecionada ou detectada');
      } else if (error.name === 'SecurityError') {
        toast.error('Permissão negada. Autorize o acesso à impressora USB');
      } else {
        toast.error('Erro: ' + error.message);
      }
    }
    setConnecting(false);
  };

  const sendToPrinter = async (data) => {
    if (!printerDevice) {
      throw new Error('Impressora não conectada');
    }

    try {
      // Open connection if needed
      if (!printerDevice.opened) {
        await printerDevice.open();
        if (printerDevice.configuration === null) {
          await printerDevice.selectConfiguration(1);
        }
        await printerDevice.claimInterface(0);
      }

      // Convert string to bytes
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);

      // Find endpoint (usually endpoint 1)
      const endpoint = printerDevice.configuration.interfaces[0].alternate.endpoints.find(
        ep => ep.direction === 'out'
      );

      if (!endpoint) {
        throw new Error('Endpoint de saída não encontrado');
      }

      // Send data
      await printerDevice.transferOut(endpoint.endpointNumber, bytes);
      console.log('✅ Dados enviados para impressora');
    } catch (error) {
      console.error('❌ Erro ao enviar para impressora:', error);
      throw error;
    }
  };

  const formatOrder = (order) => {
    const storeName = settings?.store_name || 'Loja';
    const orderNum = String(order.order_number || '').padStart(3, '0');
    const datetime = order.order_datetime || new Date().toLocaleString('pt-BR');
    
    let receipt = ESCPOS.INIT;
    
    // Header
    receipt += ESCPOS.ALIGN_CENTER;
    receipt += ESCPOS.TEXT_2X;
    receipt += ESCPOS.BOLD_ON;
    receipt += storeName + ESCPOS.LINE_FEED;
    receipt += ESCPOS.BOLD_OFF;
    receipt += ESCPOS.TEXT_NORMAL;
    receipt += ESCPOS.LINE_FEED;
    
    // Order number
    receipt += ESCPOS.TEXT_LARGE;
    receipt += ESCPOS.BOLD_ON;
    receipt += 'PEDIDO #' + orderNum + ESCPOS.LINE_FEED;
    receipt += ESCPOS.BOLD_OFF;
    receipt += ESCPOS.TEXT_NORMAL;
    receipt += datetime + ESCPOS.LINE_FEED;
    receipt += '--------------------------------' + ESCPOS.LINE_FEED;
    receipt += ESCPOS.LINE_FEED;
    
    // Customer info
    receipt += ESCPOS.ALIGN_LEFT;
    if (order.customer_name && order.customer_name !== 'Balcão') {
      receipt += ESCPOS.BOLD_ON;
      receipt += 'Cliente: ' + order.customer_name + ESCPOS.LINE_FEED;
      receipt += ESCPOS.BOLD_OFF;
    }
    if (order.customer_phone && order.customer_phone !== 'PDV') {
      receipt += 'Tel: ' + order.customer_phone + ESCPOS.LINE_FEED;
    }
    receipt += ESCPOS.LINE_FEED;
    
    // Consumption type
    if (order.consumption_type) {
      receipt += ESCPOS.BOLD_ON;
      receipt += (order.consumption_type === 'local' ? '🍽️  COMER NO LOCAL' : '📦 VIAGEM') + ESCPOS.LINE_FEED;
      receipt += ESCPOS.BOLD_OFF;
      receipt += '--------------------------------' + ESCPOS.LINE_FEED;
      receipt += ESCPOS.LINE_FEED;
    }
    
    // Items
    receipt += ESCPOS.BOLD_ON;
    receipt += 'ITENS:' + ESCPOS.LINE_FEED;
    receipt += ESCPOS.BOLD_OFF;
    receipt += ESCPOS.LINE_FEED;
    
    order.items?.forEach(item => {
      const qty = item.weight ? `${item.weight.toFixed(3)}kg` : `${item.quantity}x`;
      receipt += `${qty} ${item.product_name}` + ESCPOS.LINE_FEED;
      
      // Complements
      if (item.complements && item.complements.length > 0) {
        item.complements.forEach(comp => {
          receipt += `  + ${comp.name}` + ESCPOS.LINE_FEED;
        });
      }
      
      // Price
      receipt += `   R$ ${item.total.toFixed(2)}` + ESCPOS.LINE_FEED;
      receipt += ESCPOS.LINE_FEED;
    });
    
    receipt += '--------------------------------' + ESCPOS.LINE_FEED;
    
    // Total
    receipt += ESCPOS.ALIGN_CENTER;
    receipt += ESCPOS.TEXT_2X;
    receipt += ESCPOS.BOLD_ON;
    receipt += 'TOTAL: R$ ' + order.total.toFixed(2) + ESCPOS.LINE_FEED;
    receipt += ESCPOS.BOLD_OFF;
    receipt += ESCPOS.TEXT_NORMAL;
    receipt += '--------------------------------' + ESCPOS.LINE_FEED;
    receipt += ESCPOS.LINE_FEED;
    
    // Payment method
    receipt += ESCPOS.ALIGN_LEFT;
    const paymentLabels = {
      pix: 'PIX',
      cartao: 'Cartão',
      credito: 'Crédito',
      debito: 'Débito',
      dinheiro: 'Dinheiro'
    };
    receipt += 'Pagamento: ' + (paymentLabels[order.payment_method] || 'Cartão') + ESCPOS.LINE_FEED;
    receipt += ESCPOS.LINE_FEED;
    
    // Footer
    receipt += ESCPOS.ALIGN_CENTER;
    receipt += 'Obrigado pela preferencia!' + ESCPOS.LINE_FEED;
    receipt += ESCPOS.LINE_FEED;
    receipt += ESCPOS.LINE_FEED;
    receipt += ESCPOS.LINE_FEED;
    
    // Cut paper
    receipt += ESCPOS.CUT;
    
    return receipt;
  };

  // Expose global print function
  useEffect(() => {
    window.printOrderUSB = async (orderData) => {
      if (!printerDevice) {
        console.error('❌ Impressora não conectada');
        toast.error('Conecte a impressora primeiro');
        return;
      }

      try {
        console.log('🖨️ Imprimindo pedido:', orderData);
        const receipt = formatOrder(orderData);
        await sendToPrinter(receipt);
        console.log('✅ Pedido impresso com sucesso');
      } catch (error) {
        console.error('❌ Erro ao imprimir:', error);
        toast.error('Erro ao imprimir: ' + error.message);
      }
    };

    return () => {
      delete window.printOrderUSB;
    };
  }, [printerDevice, settings]);

  const testPrint = async () => {
    try {
      const testOrder = {
        order_number: 999,
        customer_name: 'Teste',
        customer_phone: '11999999999',
        consumption_type: 'local',
        items: [
          {
            product_name: 'Açaí 500ml',
            quantity: 1,
            unit_price: 15.00,
            total: 15.00,
            complements: [
              { name: 'Leite em Pó', price: 2.00 },
              { name: 'Granola', price: 1.50 }
            ]
          }
        ],
        subtotal: 18.50,
        total: 18.50,
        payment_method: 'pix',
        order_datetime: new Date().toLocaleString('pt-BR')
      };

      const receipt = formatOrder(testOrder);
      await sendToPrinter(receipt);
      toast.success('Impressão de teste enviada!');
    } catch (error) {
      toast.error('Erro no teste: ' + error.message);
    }
  };

  if (!navigator.usb) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Impressão USB Local</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 mb-1">Navegador não suportado</p>
              <p className="text-sm text-red-700">
                WebUSB só funciona em navegadores <strong>Chrome</strong> ou <strong>Edge</strong> (versão 61+).
                Firefox e Safari não são compatíveis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🖨️ Impressão USB Local (WebUSB)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>✨ Sistema de impressão local sem instalações!</strong><br />
            Conecta diretamente com sua impressora térmica USB via navegador.
          </p>
        </div>

        {connected ? (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-800">Impressora Conectada</p>
                  <p className="text-sm text-green-700">{printerName}</p>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConnected(false);
                    printerDevice = null;
                    setPrinterName('');
                  }}
                >
                  Desconectar
                </Button>
              </div>
            </div>

            <Button
              onClick={testPrint}
              className="w-full"
              size="lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Printer className="w-5 h-5 mr-2" />
              Fazer Teste de Impressão
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <strong>⚡ Impressão automática ativada!</strong><br />
                Pedidos pagos serão impressos automaticamente nesta impressora.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-700 mb-3">
                <strong>⚠️ Requisitos importantes:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>✅ Impressora térmica conectada via USB</li>
                <li>✅ Driver instalado no Windows</li>
                <li>✅ Impressora ligada e pronta</li>
                <li>✅ Usar navegador Chrome ou Edge</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={connectPrinter}
                disabled={connecting}
                className="col-span-2"
                size="lg"
                style={{ backgroundColor: primaryColor }}
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5 mr-2" />
                    Conectar Impressora USB
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Passo a passo:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                <li>Certifique-se que a impressora está ligada</li>
                <li>Clique em "Conectar Impressora USB" abaixo</li>
                <li>Uma janela do Chrome/Edge abrirá</li>
                <li>Selecione sua impressora na lista</li>
                <li>Clique em "Conectar" na janela</li>
                <li>Pronto! Autorização feita apenas uma vez</li>
              </ol>
            </div>
            
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-bold mb-2">
                🔧 Não aparece sua impressora térmica?
              </p>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1.5">
                <li><strong>Procure por "printer", "thermal", "POS", ou nome da marca</strong> (Bematech, Elgin, Epson, etc.)</li>
                <li>Se aparecer apenas "USB Receiver", "NIC" ou dispositivos genéricos, sua impressora <strong>não é compatível com WebUSB</strong></li>
                <li>Certifique-se que a impressora está <strong>ligada e com papel</strong></li>
                <li>Teste desconectar e reconectar o cabo USB</li>
                <li><strong>SOLUÇÃO:</strong> Use o PrintNode (seção abaixo) - funciona com qualquer impressora!</li>
              </ul>
            </div>
            
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <p className="text-sm text-red-800">
                <strong>⚠️ LIMITAÇÃO DO WEBUSB:</strong><br />
                Nem todas as impressoras térmicas são compatíveis com WebUSB. 
                Se sua impressora não aparecer na lista ou aparecer com nome genérico (como "USB Device"), 
                ela não pode ser usada via navegador.<br /><br />
                <strong>✅ Recomendamos usar o PrintNode</strong> (configuração abaixo) - funciona com 100% das impressoras!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}