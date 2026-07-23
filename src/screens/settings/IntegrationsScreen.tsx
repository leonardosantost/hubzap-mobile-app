import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';
import { AxiosError } from 'axios';

import { Icon } from '@/components-next/common';
import { TAB_BAR_HEIGHT } from '@/constants';
import { EvolutionApiService, EvolutionOverview } from '@/store/evolution-api/evolutionApiService';
import { ChevronLeft, WhatsAppIcon } from '@/svg-icons';
import { tailwind } from '@/theme';

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
        <Animated.Text style={tailwind.style('flex-1 text-center text-[17px] font-inter-medium-24 text-gray-950')}>
          Integrações
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1')} />
      </Animated.View>
    </Animated.View>
  );
};

const statusText = (state?: string) => {
  if (state === 'open') return 'Conectado';
  if (state === 'connecting') return 'Conectando';
  if (state === 'close') return 'Desconectado';
  return 'Configurar';
};

const IntegrationsScreen = () => {
  const navigation = useNavigation();
  const [overview, setOverview] = useState<EvolutionOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await EvolutionApiService.overview();
      setOverview(data);
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      const serverError = ((error as AxiosError).response?.data as { error?: string })?.error;
      const message =
        serverError ||
        (status === 404
          ? 'O backend publicado ainda não possui a rota da Evolution API.'
          : status === 403
            ? 'Seu usuário não tem permissão para ver integrações.'
            : 'Não foi possível carregar as integrações do servidor.');
      setLoadError(message);
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

  const whatsappState = overview?.connections[0]?.state;

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
                Falha ao carregar integrações
              </Animated.Text>
              <Animated.Text style={tailwind.style('pt-1 text-sm font-inter-normal-20 text-gray-700')}>
                {loadError}
              </Animated.Text>
            </Animated.View>
          ) : null}

          {!loadError && !overview?.configured ? (
            <Animated.View style={tailwind.style('mx-4 mt-5 rounded-[8px] bg-yellow-50 p-4')}>
              <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                Evolution API não configurada
              </Animated.Text>
              <Animated.Text style={tailwind.style('pt-1 text-sm font-inter-normal-20 text-gray-700')}>
                Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no backend.
              </Animated.Text>
            </Animated.View>
          ) : null}

          <Animated.View style={tailwind.style('pt-2')}>
            <Pressable
              style={tailwind.style('mx-4 flex-row items-center border-b-[1px] border-b-blackA-A3 py-4')}
              onPress={() => navigation.dispatch(StackActions.push('EvolutionConnectionsScreen'))}>
              <Animated.View style={tailwind.style('h-[46px] w-[46px] items-center justify-center rounded-[8px] bg-green-50')}>
                <Icon icon={<WhatsAppIcon />} size={28} />
              </Animated.View>
              <Animated.View style={tailwind.style('ml-3 flex-1')}>
                <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                  WhatsApp Web
                </Animated.Text>
                <Animated.Text style={tailwind.style('pt-0.5 text-sm font-inter-normal-20 text-gray-700')}>
                  QR Code
                </Animated.Text>
              </Animated.View>
              <Animated.Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-700')}>
                {statusText(whatsappState)}
              </Animated.Text>
            </Pressable>
          </Animated.View>

          <Animated.Text style={tailwind.style('px-4 pt-7 text-sm font-inter-medium-24 uppercase text-gray-700')}>
            Canais configurados
          </Animated.Text>
          {overview?.inboxes.map(inbox => (
            <Animated.View
              key={inbox.id}
              style={tailwind.style('mx-4 min-h-[48px] flex-row items-center border-b-[1px] border-b-blackA-A3 py-2')}>
              <Animated.View style={tailwind.style('flex-1 justify-center')}>
                <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 leading-[18px] text-gray-950')}>
                  {inbox.name}
                </Animated.Text>
              </Animated.View>
              <Animated.View style={tailwind.style('justify-center')}>
                <Animated.Text style={tailwind.style('text-xs font-inter-normal-20 leading-[16px] text-gray-700')}>
                  {inbox.provider === 'evolution_api' ? 'WhatsApp Web' : inbox.provider}
                </Animated.Text>
              </Animated.View>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default IntegrationsScreen;
