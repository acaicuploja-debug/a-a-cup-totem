import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, Phone, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TotemHeader from '../TotemHeader';
import LoyaltyCard from '../LoyaltyCard';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

export default function TotemCustomer({ 
  settings, 
  primaryColor,
  onComplete,
  onBack 
}) {
  const { customer, setCustomer } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showRewardPrompt, setShowRewardPrompt] = useState(false);
  
  const queryClient = useQueryClient();
  
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };
  
  const formatCpf = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };
  
  useEffect(() => {
    const searchCustomer = async () => {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        setIsSearching(true);
        try {
          const customers = await base44.entities.Customer.filter({ phone: cleanPhone });
          if (customers && customers.length > 0) {
            const existing = customers[0];
            setFoundCustomer(existing);
            setName(existing.name || '');
            setCpf(existing.cpf || '');
            
            if (existing.has_pending_reward) {
              setShowRewardPrompt(true);
            }
          } else {
            setFoundCustomer(null);
          }
        } catch (error) {
          console.error('Error searching customer:', error);
        }
        setIsSearching(false);
      }
    };
    
    const debounce = setTimeout(searchCustomer, 500);
    return () => clearTimeout(debounce);
  }, [phone]);
  
  const createCustomerMutation = useMutation({
    mutationFn: async (data) => {
      if (foundCustomer) {
        await base44.entities.Customer.update(foundCustomer.id, data);
        return { ...foundCustomer, ...data };
      } else {
        return await base44.entities.Customer.create(data);
      }
    },
    onSuccess: (customer) => {
      setCustomer(customer);
      queryClient.invalidateQueries(['customers']);
    }
  });
  
  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Telefone inválido');
      return;
    }
    
    try {
      await createCustomerMutation.mutateAsync({
        name,
        phone: cleanPhone,
        cpf: cpf.replace(/\D/g, '')
      });
      onComplete();
    } catch (error) {
      toast.error('Erro ao salvar dados');
    }
  };
  
  const handleRedeemReward = () => {
    setCustomer({ ...foundCustomer, redeeming_reward: true });
    onComplete();
  };
  
  const handleSkipReward = () => {
    setShowRewardPrompt(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <TotemHeader 
        title="Identificação"
        showBack
        onBack={onBack}
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-10">
            <div 
              className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <User className="w-12 h-12" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Seus Dados
            </h2>
            <p className="text-lg text-gray-500">
              Para identificar seu pedido
            </p>
          </div>
          
          {showRewardPrompt && foundCustomer?.has_pending_reward && (
            <div className="mb-6">
              <LoyaltyCard
                customer={foundCustomer}
                settings={settings}
                onRedeem={handleRedeemReward}
                onSkip={handleSkipReward}
                primaryColor={primaryColor}
              />
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-xl font-bold">
                Telefone *
              </Label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="pl-16 h-16 text-xl rounded-2xl border-2"
                  required
                />
                {isSearching && (
                  <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 animate-spin text-gray-400" />
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="name" className="text-xl font-bold">
                Nome
              </Label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="pl-16 h-16 text-xl rounded-2xl border-2"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="cpf" className="text-xl font-bold">
                CPF
              </Label>
              <div className="relative">
                <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <Input
                  id="cpf"
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="pl-16 h-16 text-xl rounded-2xl border-2"
                  maxLength={14}
                />
              </div>
            </div>
            
            {foundCustomer && !foundCustomer.has_pending_reward && (
              <LoyaltyCard
                customer={foundCustomer}
                settings={settings}
                primaryColor={primaryColor}
              />
            )}
          </form>
        </motion.div>
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-xl mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={!phone || phone.replace(/\D/g, '').length < 10 || createCustomerMutation.isPending}
            className="w-full h-16 text-xl font-bold rounded-2xl text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {createCustomerMutation.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Continuar
                <ArrowRight className="w-6 h-6 ml-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}