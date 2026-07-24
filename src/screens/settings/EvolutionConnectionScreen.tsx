import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { Button, Icon } from '@/components-next';
import { TAB_BAR_HEIGHT } from '@/constants';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';
import {
  EvolutionApiService,
  EvolutionConnection,
} from '@/store/evolution-api/evolutionApiService';
import { ChevronLeft, WhatsAppIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';

type Route = RouteProp<SettingsStackParamList, 'EvolutionConnectionScreen'>;

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
          WhatsApp Web
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1')} />
      </Animated.View>
    </Animated.View>
  );
};

const normalizeQrCode = (qrcode?: string) => {
  if (!qrcode) return undefined;
  return qrcode.startsWith('data:image') ? qrcode : `data:image/png;base64,${qrcode}`;
};

const extractQrBase64 = (qrcode?: string) => qrcode?.replace(/^data:image\/\w+;base64,/, '');

const statusText = (state?: string) => {
  if (state === 'open') return 'Conectado';
  if (state === 'connecting') return 'Aguardando leitura do QR Code';
  if (state === 'close') return 'Desconectado';
  return 'Nao conectado';
};

const instanceSuffix = (instanceName?: string) => {
  if (!instanceName) return undefined;
  return instanceName.slice(-8);
};

const EvolutionConnectionScreen = () => {
  const route = useRoute<Route>();
  const inboxId = route.params?.inboxId;
  const isCreateMode = route.params?.mode === 'create' || !inboxId;
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [connection, setConnection] = useState<EvolutionConnection | null>(null);
  const [loading, setLoading] = useState(!isCreateMode);
  const [submitting, setSubmitting] = useState(false);

  const qrCode = useMemo(() => normalizeQrCode(connection?.qrcode), [connection?.qrcode]);
  const qrBase64 = useMemo(() => extractQrBase64(qrCode), [qrCode]);

  const load = useCallback(async () => {
    if (!inboxId) return;
    const overview = await EvolutionApiService.overview();
    const current = overview.connections.find(item => item.inbox_id === inboxId);
    if (current) {
      setConnection(current);
    }
  }, [inboxId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!connection?.inbox_id || connection.state === 'open') return;

    pollingRef.current = setInterval(async () => {
      const status = await EvolutionApiService.status(connection.inbox_id);
      setConnection(current => ({ ...current, ...status }));
      if (status.state === 'open' && pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [connection?.inbox_id, connection?.state]);

  const createConnection = async () => {
    setSubmitting(true);
    try {
      const created = await EvolutionApiService.create('WhatsApp Web');
      setConnection(created);
      showToast({ message: 'Conexão criada' });
    } finally {
      setSubmitting(false);
    }
  };

  const connect = async () => {
    if (!connection?.inbox_id) return;
    setSubmitting(true);
    try {
      const response = await EvolutionApiService.connect(connection.inbox_id);
      setConnection(current => ({ ...current, ...response }));
    } finally {
      setSubmitting(false);
    }
  };

  const reconnect = async () => {
    if (!connection?.inbox_id) return;
    setSubmitting(true);
    try {
      const response = await EvolutionApiService.reconnect(connection.inbox_id);
      setConnection(current => ({ ...current, ...response }));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteConnection = async () => {
    if (!connection?.inbox_id) return;

    Alert.alert(
      'Excluir instância',
      'A instância será removida da Evolution API. O histórico no Chatwoot será preservado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await EvolutionApiService.destroy(connection.inbox_id);
              setConnection(current =>
                current
                  ? {
                      ...current,
                      state: 'deleted',
                      number: undefined,
                      profile_name: undefined,
                      profile_picture_url: undefined,
                      qrcode: undefined,
                    }
                  : current,
              );
              showToast({ message: 'Instância excluída' });
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const shareQrCode = async () => {
    if (!qrBase64) return;

    try {
      const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!directory) throw new Error('File system directory unavailable');

      const fileUri = `${directory}joota-whatsapp-qr.png`;
      await FileSystem.writeAsStringAsync(fileUri, qrBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Share.share({
        title: 'QR Code WhatsApp Web',
        message: 'Escaneie este QR Code pelo WhatsApp em Aparelhos conectados.',
        url: fileUri,
      });
    } catch {
      showToast({ message: 'Não foi possível compartilhar o QR Code' });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header />
      {loading ? (
        <Animated.View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator />
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={tailwind.style(`px-4 pb-[${TAB_BAR_HEIGHT + 28}px]`)}>
          <Animated.View style={tailwind.style('items-center pt-7')}>
            <Animated.View
              style={tailwind.style(
                'h-[64px] w-[64px] items-center justify-center rounded-[14px] bg-green-50',
              )}>
              <Icon icon={<WhatsAppIcon />} size={38} />
            </Animated.View>
            <Animated.Text
              style={tailwind.style('pt-4 text-xl font-inter-medium-24 text-gray-950')}>
              {statusText(connection?.state)}
            </Animated.Text>
            <Animated.Text
              style={tailwind.style('pt-1 text-center text-sm font-inter-normal-20 text-gray-700')}>
              {connection?.number || connection?.profile_name || 'Crie a conexão e leia o QR Code.'}
            </Animated.Text>
          </Animated.View>

          {qrCode ? (
            <Animated.View style={tailwind.style('items-center pt-8')}>
              <Image
                source={{ uri: qrCode }}
                resizeMode="contain"
                style={tailwind.style('h-[260px] w-[260px]')}
              />
              <Animated.Text
                style={tailwind.style(
                  'px-3 pt-4 text-center text-sm font-inter-normal-20 text-gray-700',
                )}>
                Se o WhatsApp estiver neste mesmo celular, compartilhe o QR Code e abra em outro
                aparelho para escanear por Aparelhos conectados.
              </Animated.Text>
              <Animated.View style={tailwind.style('w-full pt-4')}>
                <Button text="Compartilhar QR Code" variant="secondary" handlePress={shareQrCode} />
              </Animated.View>
            </Animated.View>
          ) : null}

          <Animated.View style={tailwind.style('gap-3 pt-8')}>
            {isCreateMode && !connection ? (
              <Button
                text={submitting ? 'Criando...' : 'Criar conexão'}
                handlePress={createConnection}
                disabled={submitting}
              />
            ) : connection?.state === 'open' ? (
              <Button
                text="Reconectar"
                variant="secondary"
                handlePress={reconnect}
                disabled={submitting}
              />
            ) : qrCode ? (
              <Button
                text={submitting ? 'Conectando...' : 'Atualizar QR Code'}
                handlePress={connect}
                disabled={submitting}
              />
            ) : (
              <>
                <Button
                  text={submitting ? 'Conectando...' : 'Conectar'}
                  handlePress={connect}
                  disabled={submitting}
                />
              </>
            )}
            {connection?.inbox_id ? (
              <Button
                text="Excluir instância"
                variant="secondary"
                isDestructive
                handlePress={deleteConnection}
                disabled={submitting}
              />
            ) : null}
          </Animated.View>
          {instanceSuffix(connection?.instance_name) ? (
            <Animated.Text
              style={tailwind.style('pt-6 text-center text-xs font-inter-normal-20 text-gray-700')}>
              ID da conexão: ...{instanceSuffix(connection?.instance_name)}
            </Animated.Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default EvolutionConnectionScreen;
