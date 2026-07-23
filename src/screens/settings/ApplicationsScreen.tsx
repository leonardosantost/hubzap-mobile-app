import React from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import { Icon } from '@/components-next/common';
import { TAB_BAR_HEIGHT } from '@/constants';
import {
  ChevronLeft,
  FacebookFilledIcon,
  InstagramFilledIcon,
  KeyRoundIcon,
  MacrosIcon,
  MailIcon,
  MessengerFilledIcon,
  TelegramIcon,
  WhatsAppIcon,
  ChatIcon,
} from '@/svg-icons';
import { tailwind } from '@/theme';

type AppItem = {
  name: string;
  icon: React.ReactNode;
  logoUri?: string;
  backgroundColor: string;
  iconSize?: number;
};

type AppSection = {
  title: string;
  items: AppItem[];
};

const AppGlyph = ({
  color,
  type,
}: {
  color: string;
  type: 'catalog' | 'pos' | 'calendar' | 'shipping' | 'payment' | 'store' | 'api';
}) => {
  if (type === 'catalog') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Path d="M5 7.5H19V19H5V7.5Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <Path
          d="M8 7.5C8 5.3 9.6 4 12 4C14.4 4 16 5.3 16 7.5"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <Path d="M8 12H16" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'pos') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Rect x="6" y="4" width="12" height="16" rx="2" stroke={color} strokeWidth="1.7" />
        <Path
          d="M9 8H15M9 12H10.5M13.5 12H15M9 16H15"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (type === 'calendar') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="6" width="14" height="13" rx="2" stroke={color} strokeWidth="1.7" />
        <Path d="M8 4V8M16 4V8M5 10H19" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
        <Circle cx="12" cy="14.5" r="1.7" fill={color} />
      </Svg>
    );
  }

  if (type === 'shipping') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Path d="M4 8H14V17H4V8Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <Path
          d="M14 11H17.5L20 14V17H14V11Z"
          stroke={color}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <Circle cx="8" cy="18" r="1.5" stroke={color} strokeWidth="1.7" />
        <Circle cx="17" cy="18" r="1.5" stroke={color} strokeWidth="1.7" />
      </Svg>
    );
  }

  if (type === 'payment') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="7" width="16" height="11" rx="2" stroke={color} strokeWidth="1.7" />
        <Path d="M4 11H20M8 15H11" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'store') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Path d="M5 10L6.5 5H17.5L19 10" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <Path d="M6 10V19H18V10" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <Path d="M9 19V14H15V19" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 9L5 12L8 15M16 9L19 12L16 15"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M13.5 7L10.5 17" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
};

const sections: AppSection[] = [
  {
    title: 'Integrações',
    items: [
      { name: 'WhatsApp', icon: <WhatsAppIcon />, backgroundColor: '#E8F8EC' },
      { name: 'Email', icon: <MailIcon stroke="#2563EB" />, backgroundColor: '#EDF4FF' },
      { name: 'Instagram', icon: <InstagramFilledIcon />, backgroundColor: '#FCEBFA' },
      { name: 'Markeplace', icon: <FacebookFilledIcon />, backgroundColor: '#EDF4FF' },
      { name: 'Messenger', icon: <MessengerFilledIcon />, backgroundColor: '#EDF4FF' },
      { name: 'Telegram', icon: <TelegramIcon />, backgroundColor: '#EAF6FF' },
      { name: 'API', icon: <KeyRoundIcon stroke="#374151" />, backgroundColor: '#F3F4F6' },
    ],
  },
  {
    title: 'Vendas',
    items: [
      {
        name: 'Catálogo',
        icon: <AppGlyph color="#0F766E" type="catalog" />,
        backgroundColor: '#E6F6F3',
      },
      { name: 'PDV', icon: <AppGlyph color="#7C3AED" type="pos" />, backgroundColor: '#F1EAFF' },
      {
        name: 'Agendamentos',
        icon: <AppGlyph color="#2563EB" type="calendar" />,
        backgroundColor: '#EAF1FF',
      },
      {
        name: 'Olist',
        icon: null,
        logoUri: 'https://logo.clearbit.com/olist.com?size=256',
        backgroundColor: '#EAF8EF',
        iconSize: 48,
      },
      {
        name: 'Bling',
        icon: null,
        logoUri: 'https://logo.clearbit.com/bling.com.br?size=256',
        backgroundColor: '#EAF8EF',
        iconSize: 48,
      },
      {
        name: 'Frenet',
        icon: null,
        logoUri: 'https://logo.clearbit.com/frenet.com.br?size=256',
        backgroundColor: '#FFF1E8',
        iconSize: 48,
      },
      {
        name: 'Melhor Envio',
        icon: null,
        logoUri: 'https://logo.clearbit.com/melhorenvio.com.br?size=256',
        backgroundColor: '#E7F7FB',
        iconSize: 50,
      },
    ],
  },
  {
    title: 'Funcionalidades',
    items: [
      { name: 'Chat de Equipe', icon: <ChatIcon stroke="#374151" />, backgroundColor: '#F3F4F6' },
      { name: 'Automações', icon: <MacrosIcon stroke="#0F766E" />, backgroundColor: '#E6F6F3' },
    ],
  },
  {
    title: 'Pagamentos',
    items: [
      {
        name: 'Mercado Pago',
        icon: null,
        logoUri: 'https://logo.clearbit.com/mercadopago.com.br?size=256',
        backgroundColor: '#E7F7FB',
        iconSize: 50,
      },
      {
        name: 'Asaas',
        icon: null,
        logoUri: 'https://logo.clearbit.com/asaas.com?size=256',
        backgroundColor: '#EAF1FF',
        iconSize: 48,
      },
    ],
  },
];

const ApplicationsHeader = () => {
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
            'flex-1 text-center text-[17px] font-inter-medium-24 leading-[17px] tracking-[0.32px] text-gray-950',
          )}>
          Aplicativos
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1')} />
      </Animated.View>
    </Animated.View>
  );
};

const AppCard = ({ item }: { item: AppItem }) => (
  <Pressable style={tailwind.style('w-1/3 px-1.5 pb-5')} onPress={() => {}}>
    <Animated.View style={tailwind.style('items-center')}>
      <Animated.View
        style={[
          tailwind.style('h-[58px] w-[58px] items-center justify-center rounded-[16px]'),
          { backgroundColor: item.backgroundColor },
        ]}>
        {item.logoUri ? (
          <Image
            source={{ uri: item.logoUri }}
            resizeMode="contain"
            style={tailwind.style(`h-[${item.iconSize || 42}px]`, `w-[${item.iconSize || 42}px]`)}
          />
        ) : (
          <Icon icon={item.icon} size={item.iconSize || 32} />
        )}
      </Animated.View>
      <Animated.Text
        numberOfLines={2}
        style={tailwind.style(
          'pt-2 text-center text-sm font-inter-medium-24 leading-[16px] tracking-[0.16px] text-gray-950',
        )}>
        {item.name}
      </Animated.Text>
    </Animated.View>
  </Pressable>
);

const AppSectionGrid = ({ section }: { section: AppSection }) => (
  <Animated.View style={tailwind.style('pt-6')}>
    <Animated.Text
      style={tailwind.style(
        'px-4 pb-4 text-base font-inter-medium-24 leading-[20px] tracking-[0.24px] text-gray-950',
      )}>
      {section.title}
    </Animated.Text>
    <Animated.View style={tailwind.style('flex-row flex-wrap px-2')}>
      {section.items.map(item => (
        <AppCard key={`${section.title}-${item.name}`} item={item} />
      ))}
    </Animated.View>
  </Animated.View>
);

const ApplicationsScreen = () => {
  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <ApplicationsHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        {sections.map(section => (
          <AppSectionGrid key={section.title} section={section} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ApplicationsScreen;
