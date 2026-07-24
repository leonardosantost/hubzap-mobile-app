import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { AxiosError } from 'axios';

import { Icon } from '@/components-next/common';
import { TAB_BAR_HEIGHT } from '@/constants';
import { MercadoPagoOverview, MercadoPagoService } from '@/store/mercado-pago/mercadoPagoService';
import { CartIcon, ChevronLeft, LinkIcon, Trash } from '@/svg-icons';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';

const Header = () => {
  const navigation = useNavigation();

  return (
    <Animated.View style={tailwind.style('border-b-[1px] border-b-blackA-A3 bg-white')}>
      <Animated.View style={tailwind.style('flex-row items-center px-4 pt-2 pb-3')}>
        <Animated.View style={tailwind.style('flex-1 items-start')}>
          <Pressable hitSlop={16} onPress={() => navigation.goBack()}>
            <Icon icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} size={24} />
          </Pressable>
        </Animated.View>
        <Animated.Text
          style={tailwind.style(
            'flex-1 text-center text-[17px] font-inter-medium-24 text-gray-950',
          )}>
          Mercado Pago
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1')} />
      </Animated.View>
    </Animated.View>
  );
};

const statusLabel = (overview: MercadoPagoOverview | null) => {
  if (!overview?.configured) return 'Backend pendente';
  if (overview.connected) return 'Conectado';
  return 'Desconectado';
};

const MercadoPagoConnectionScreen = () => {
  const [overview, setOverview] = useState<MercadoPagoOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await MercadoPagoService.overview();
      setOverview(data);
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      const serverError = ((error as AxiosError).response?.data as { error?: string })?.error;
      setLoadError(
        serverError ||
          (status === 404
            ? 'O backend publicado ainda não possui a integração Mercado Pago.'
            : 'Não foi possível carregar o Mercado Pago.'),
      );
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleConnect = async () => {
    if (connecting) return;

    setConnecting(true);
    try {
      const data = await MercadoPagoService.connect();
      setOverview(data);
      if (data.authorization_url) {
        await WebBrowser.openBrowserAsync(data.authorization_url);
        showToast({ message: 'Conclua a autorização e volte para atualizar o status.' });
      } else if (data.connected) {
        showToast({ message: 'Mercado Pago conectado.' });
      }
    } catch (error) {
      const serverError = ((error as AxiosError).response?.data as { error?: string })?.error;
      showToast({ message: serverError || 'Não foi possível iniciar a conexão.' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar Mercado Pago?',
      'Novas cobranças Pix e links deixarão de ser gerados até reconectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            setDisconnecting(true);
            try {
              const data = await MercadoPagoService.disconnect();
              setOverview(data);
              showToast({ message: 'Mercado Pago desconectado.' });
            } catch {
              showToast({ message: 'Não foi possível desconectar.' });
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header />
      {loading ? (
        <Animated.View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator />
        </Animated.View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
          {loadError ? (
            <Animated.View style={tailwind.style('mx-4 mt-5 rounded-[8px] bg-red-50 p-4')}>
              <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                Falha ao carregar integração
              </Animated.Text>
              <Animated.Text
                style={tailwind.style('pt-1 text-sm font-inter-normal-20 text-gray-700')}>
                {loadError}
              </Animated.Text>
            </Animated.View>
          ) : null}

          <Animated.View
            style={tailwind.style('mx-4 mt-5 rounded-[8px] border border-blackA-A3 bg-white p-4')}>
            <Animated.View style={tailwind.style('flex-row items-center')}>
              <Animated.View
                style={tailwind.style(
                  'h-11 w-11 items-center justify-center rounded-[10px] bg-[#E7F7FB]',
                )}>
                <Icon icon={<CartIcon stroke="#008AD6" />} size={22} />
              </Animated.View>
              <Animated.View style={tailwind.style('ml-3 flex-1')}>
                <Animated.Text
                  style={tailwind.style('text-base font-inter-semibold-24 text-gray-950')}>
                  {statusLabel(overview)}
                </Animated.Text>
                <Animated.Text
                  style={tailwind.style('pt-0.5 text-sm font-inter-normal-20 text-gray-700')}>
                  Pix e link de pagamento no PDV
                </Animated.Text>
              </Animated.View>
            </Animated.View>

            {overview?.connected ? (
              <Animated.View style={tailwind.style('mt-4 rounded-[8px] bg-blackA-A2 px-3 py-3')}>
                <Animated.Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-950')}>
                  {overview.account_name || 'Conta Mercado Pago'}
                </Animated.Text>
                <Animated.Text
                  style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-gray-700')}>
                  {overview.account_email || 'Autorizada para gerar cobranças'}
                </Animated.Text>
              </Animated.View>
            ) : (
              <Animated.Text
                style={tailwind.style('mt-4 text-sm font-inter-normal-20 text-gray-700')}>
                A autorização abre o ambiente seguro do Mercado Pago. O token fica salvo somente no
                servidor Joota.
              </Animated.Text>
            )}

            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              style={tailwind.style(
                'mt-4 h-12 flex-row items-center justify-center rounded-[8px] bg-blue-800',
                connecting ? 'opacity-80' : '',
              )}>
              {connecting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon icon={<LinkIcon />} size={18} />
                  <Animated.Text
                    style={tailwind.style('ml-2 text-sm font-inter-semibold-24 text-white')}>
                    {overview?.connected ? 'Atualizar conexão' : 'Conectar Mercado Pago'}
                  </Animated.Text>
                </>
              )}
            </Pressable>

            {overview?.connected ? (
              <Pressable
                onPress={handleDisconnect}
                disabled={disconnecting}
                style={tailwind.style(
                  'mt-2 h-11 flex-row items-center justify-center rounded-[8px] border border-red-200 bg-white',
                )}>
                <Icon icon={<Trash />} size={16} />
                <Animated.Text
                  style={tailwind.style('ml-2 text-sm font-inter-semibold-24 text-red-700')}>
                  {disconnecting ? 'Desconectando...' : 'Desconectar'}
                </Animated.Text>
              </Pressable>
            ) : null}
          </Animated.View>

          <Animated.View style={tailwind.style('mx-4 mt-4 rounded-[8px] bg-yellow-50 p-4')}>
            <Animated.Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
              Backend necessário
            </Animated.Text>
            <Animated.Text
              style={tailwind.style('pt-1 text-sm font-inter-normal-20 text-gray-700')}>
              Configure MERCADO_PAGO_CLIENT_ID, MERCADO_PAGO_CLIENT_SECRET e o callback OAuth no
              Chatwoot server.
            </Animated.Text>
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default MercadoPagoConnectionScreen;
