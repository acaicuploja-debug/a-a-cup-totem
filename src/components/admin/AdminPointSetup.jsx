import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPointSetup({ primaryColor }) {
  const [linking, setLinking] = useState(false);

  const { data: deviceStatus, refetch, isLoading } = useQuery({
    queryKey: ['point-device-status'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getPointDeviceStatus');
      return data;
    },
    refetchInterval: linking ? 3000 : false,
    initialData: { linked: false }
  });

  const linkDeviceMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('linkPointDevice');
      
      if (result.data?.error) {
        throw new Error(result.data.details || result.data.error);
      }
      return result.data;
    },
    onSuccess: async (data) => {
      toast.success(data.message || 'Point Smart vinculada!');
      // Recarrega a página para garantir que o estado seja atualizado
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    }
  });

  const handleLink = () => {
    linkDeviceMutation.mutate();
  };

  const stopChecking = () => {
    setLinking(false);
  };

  React.useEffect(() => {
    if (linking && deviceStatus?.linked) {
      setLinking(false);
      toast.success('Point Smart vinculada com sucesso!');
    }
  }, [linking, deviceStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Vinculação da Point Smart
        </CardTitle>
        <CardDescription>
          Vincule sua maquininha Point Smart ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deviceStatus?.linked ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Point Smart vinculada!</p>
              <p className="text-sm text-green-700">
                Device ID: {deviceStatus.device?.id || 'Vinculado'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 mb-2">Vincular Point Smart:</p>
                  <p className="text-sm text-blue-800 mb-2">
                    Clique no botão abaixo para vincular sua Point Smart que já está cadastrada na sua conta do Mercado Pago.
                  </p>
                  <p className="text-xs text-blue-700">
                    Certifique-se de que você já cadastrou sua Point Smart no app do Mercado Pago antes de vincular aqui.
                  </p>
                </div>
              </div>
            </div>

            {linking ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
                  <div>
                    <p className="font-medium">Aguardando vinculação...</p>
                    <p className="text-sm text-gray-500">Vincule a Point Smart agora no app</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={stopChecking}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleLink}
                disabled={linkDeviceMutation.isPending}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                {linkDeviceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Vincular Point Smart
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}