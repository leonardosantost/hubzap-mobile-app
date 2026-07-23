import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';
import { AxiosError } from 'axios';

import { Icon } from '@/components-next/common';
import { TAB_BAR_HEIGHT } from '@/constants';
import { EvolutionApiService, EvolutionConnection } from '@/store/evolution-api/evolutionApiService';
import { AddIcon, ChevronLeft, WhatsAppIcon } from '@/svg-icons';
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
          WhatsApp Web
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1 items-end')}>
          <Pressable
            hitSlop={12}
            onPress={() => navigation.dispatch(StackActions.push('EvolutionConnectionScreen', { mode: 'create' }))}>
            <Icon icon={<AddIcon stroke={tailwind.color('text-blue-700')} />} size={24} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const statusText = (state?: string) => {
  if (state === 'open') return 'Conectado';
  if (state === 'connecting') return 'Conectando';
  if (state === 'close') return 'Desconectado';
  if (state === 'deleted') return 'Excluida';
  return 'Aguardando';
};

const connectionSubtitle = (connection: EvolutionConnection) => {
  if (connection.number) return connection.number;
  if (connection.profile_name) return connection.profile_name;
  if (connection.instance_name) return `ID da conexão: ...${connection.instance_name.slice(-8)}`;

  return 'Aguardando conexão';
};

const EvolutionConnectionsScreen = () => {
  const navigation = useNavigation();
  const [connections, setConnections] = useState<EvolutionConnection[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await EvolutionApiService.overview();
      setConnections(data.connections);
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      const serverError = ((error as AxiosError).response?.data as { error?: string })?.error;
      const message =
        serverError ||
        (status === 404
          ? 'O backend publicado ainda não possui a rota da Evolution API.'
          : status === 403
            ? 'Seu usuário não tem permissão para ver integrações.'
            : 'Não foi possível carregar as conexões.');
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
                Falha ao carregar conexões
              </Animated.Text>
              <Animated.Text style={tailwind.style('pt-1 text-sm font-inter-normal-20 text-gray-700')}>
                {loadError}
              </Animated.Text>
            </Animated.View>
          ) : null}
          {!loadError && connections.length === 0 ? (
            <Animated.View style={tailwind.style('px-4 py-8')}>
              <Animated.Text style={tailwind.style('text-center text-base font-inter-normal-20 text-gray-700')}>
                Nenhuma conexão configurada.
              </Animated.Text>
            </Animated.View>
          ) : null}
          {connections.map(connection => (
            <Pressable
              key={connection.inbox_id}
              style={tailwind.style('mx-4 flex-row items-center border-b-[1px] border-b-blackA-A3 py-4')}
              onPress={() =>
                navigation.dispatch(StackActions.push('EvolutionConnectionScreen', { inboxId: connection.inbox_id }))
              }>
              <Animated.View style={tailwind.style('h-[46px] w-[46px] items-center justify-center rounded-[8px] bg-green-50')}>
                <Icon icon={<WhatsAppIcon />} size={28} />
              </Animated.View>
              <Animated.View style={tailwind.style('ml-3 flex-1')}>
                <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                  {connection.inbox_name}
                </Animated.Text>
                <Animated.Text style={tailwind.style('pt-0.5 text-sm font-inter-normal-20 text-gray-700')}>
                  {connectionSubtitle(connection)}
                </Animated.Text>
              </Animated.View>
              <Animated.Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-700')}>
                {statusText(connection.state)}
              </Animated.Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default EvolutionConnectionsScreen;
