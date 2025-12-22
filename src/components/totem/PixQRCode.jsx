import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, RefreshCw, CreditCard, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import QRCode from 'qrcode';

function generatePixCode(pixKey, value, receiverName, merchantCity) {
  if (!pixKey || !value || value <= 0) {
    console.error('Invalid PIX parameters:', { pixKey, value });
    return '';
  }

  const cleanKey = String(pixKey).trim();
  
  // Função para formatar campo EMV
  const EMV = (id, value) => {
    const str = String(value);
    const len = String(str.length).padStart(2, '0');
    return id + len + str;
  };

  // Limpar nome - remover acentos e caracteres especiais
  const cleanName = String(receiverName || 'MERCHANT')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .substring(0, 25);

  const cleanCity = String(merchantCity || 'SAO PAULO')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .substring(0, 15);

  // Construir payload EMV
  let payload = '';
  payload += EMV('00', '01'); // Payload Format Indicator
  
  // Merchant Account Information - PIX
  const merchantAccountInfo = EMV('00', 'BR.GOV.BCB.PIX') + EMV('01', cleanKey);
  payload += EMV('26', merchantAccountInfo);
  
  payload += EMV('52', '0000'); // Merchant Category Code
  payload += EMV('53', '986'); // Transaction Currency (BRL)
  payload += EMV('54', value.toFixed(2)); // Transaction Amount
  payload += EMV('58', 'BR'); // Country Code
  payload += EMV('59', cleanName); // Merchant Name
  payload += EMV('60', cleanCity); // Merchant City
  
  // Additional Data Field Template
  const txid = '***' + Date.now().toString().slice(-10);
  const additionalInfo = EMV('05', txid);
  payload += EMV('62', additionalInfo);
  
  // CRC16 placeholder
  payload += '6304';
  
  // Calcular e adicionar CRC16
  const crc = computeCRC16(payload);
  payload += crc;
  
  console.log('PIX Code gerado:', payload);
  console.log('Chave:', cleanKey, 'Valor:', value, 'Nome:', cleanName);
  
  return payload;
}

function computeCRC16(str) {
  let crc = 0xFFFF;
  
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i) & 0xFF;
    crc ^= (byte << 8);
    
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export default function PixQRCode({ 
  settings,
  total,
  onConfirmPayment,
  onChangePaymentMethod,
  onExpired,
  primaryColor
}) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const canvasRef = useRef(null);
  
  const pixCode = generatePixCode(
    settings?.pix_key,
    total,
    settings?.pix_receiver_name,
    'SAO PAULO'
  );
  
  useEffect(() => {
    if (pixCode && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, pixCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(err => {
        console.error('Error generating QR code:', err);
        toast.error('Erro ao gerar QR Code');
      });
    }
  }, [pixCode]);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      setExpired(true);
      onExpired?.();
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, onExpired]);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };
  
  const handleGenerateNew = () => {
    setTimeLeft(300);
    setExpired(false);
    setCopied(false);
  };
  
  if (expired) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center p-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-red-500" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Tempo Expirado
        </h3>
        <p className="text-gray-500 mb-8">
          O tempo para pagamento via PIX expirou
        </p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button
            onClick={handleGenerateNew}
            className="h-14 text-lg font-semibold rounded-xl"
            style={{ backgroundColor: primaryColor }}
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Gerar Novo QR Code
          </Button>
          
          <Button
            variant="outline"
            onClick={onChangePaymentMethod}
            className="h-14 text-lg font-semibold rounded-xl"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Outra Forma de Pagamento
          </Button>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      className="flex flex-col items-center p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div 
        className="text-center mb-6 p-4 rounded-2xl"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-5 h-5" style={{ color: primaryColor }} />
          <span className="text-lg font-medium text-gray-700">
            Tempo restante
          </span>
        </div>
        <span 
          className="text-4xl font-bold"
          style={{ color: primaryColor }}
        >
          {formatTime(timeLeft)}
        </span>
      </div>
      
      <div className="bg-white p-4 rounded-2xl shadow-lg mb-6">
        <canvas 
          ref={canvasRef}
          className="w-full h-auto max-w-[300px] mx-auto"
        />
      </div>
      
      <p className="text-center text-gray-600 mb-4">
        Escaneie o QR Code acima com o app do seu banco
      </p>
      
      <div className="text-center mb-6">
        <span className="text-sm text-gray-500">Valor total</span>
        <p 
          className="text-3xl font-bold"
          style={{ color: primaryColor }}
        >
          R$ {total.toFixed(2)}
        </p>
      </div>
      
      <Button
        variant="outline"
        onClick={handleCopyCode}
        className="mb-6 h-12 px-6 rounded-xl"
      >
        {copied ? (
          <>
            <Check className="w-5 h-5 mr-2 text-green-500" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="w-5 h-5 mr-2" />
            Copiar Código PIX
          </>
        )}
      </Button>
      
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={onConfirmPayment}
          className="h-14 text-lg font-semibold rounded-xl"
          style={{ backgroundColor: '#22C55E' }}
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Já Paguei
        </Button>
        
        <Button
          variant="outline"
          onClick={onChangePaymentMethod}
          className="h-14 text-lg font-semibold rounded-xl"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Outra Forma de Pagamento
        </Button>
      </div>
    </motion.div>
  );
}