import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import { Icon, SearchBar } from '@/components-next';
import {
  AddIcon,
  BarcodeScanIcon,
  CaretRight,
  ChevronLeft,
  FilterIcon,
  GridIcon,
  SettingsIconOutline,
} from '@/svg-icons';
import { PointOfSaleService } from '@/store/point-of-sale/pointOfSaleService';
import type { ProductCatalogProduct } from '@/store/point-of-sale/pointOfSaleService';
import { tailwind } from '@/theme';

type PointOfSaleView = 'checkout' | 'orders' | 'settings';
type OrderStatus = 'Todos' | 'Pago' | 'Pendente' | 'Cancelado';
type RootNavigationParamList = {
  Settings: { screen: 'CatalogItemsScreen' };
};

type PaymentMethod = {
  id: string;
  title: string;
  enabled: boolean;
};

const recentOrders = [
  {
    id: '#1048',
    customer: 'Cliente recente',
    source: 'Pedido manual',
    status: 'Pago',
    totalCents: 24990,
  },
  {
    id: '#1047',
    customer: 'Venda balcão',
    source: 'Mercado Pago',
    status: 'Pendente',
    totalCents: 8990,
  },
  {
    id: '#1046',
    customer: 'Catálogo XML',
    source: 'Olist/Bling',
    status: 'Pago',
    totalCents: 38490,
  },
];

const integrations = ['Mercado Pago', 'Asaas', 'Olist', 'Bling'];

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInCents / 100);

const priceToCents = (price?: string | null) => {
  if (!price) return 0;

  const digitsAndSeparators = price.replace(/[^\d,.]/g, '');
  const hasComma = digitsAndSeparators.includes(',');
  const hasDot = digitsAndSeparators.includes('.');
  const normalizedPrice =
    hasComma && hasDot
      ? digitsAndSeparators.replace(/\./g, '').replace(',', '.')
      : digitsAndSeparators.replace(',', '.');
  const numericPrice = Number(normalizedPrice);

  return Number.isFinite(numericPrice) ? Math.round(numericPrice * 100) : 0;
};

const productPriceLabel = (product: ProductCatalogProduct) => {
  const priceCents = priceToCents(product.price);
  if (!priceCents) return 'Sem preço';
  if (!product.currency || product.currency === 'BRL') return formatCurrency(priceCents);

  return [product.currency, product.price].filter(Boolean).join(' ');
};

const HeaderSettingsIcon = () => (
  <View style={tailwind.style('h-6 w-6 items-center justify-center overflow-hidden')}>
    <View style={{ transform: [{ scale: 0.55 }] }}>
      <SettingsIconOutline />
    </View>
  </View>
);

const HeaderModeSwitch = ({
  view,
  onViewChange,
}: {
  view: PointOfSaleView;
  onViewChange: (view: PointOfSaleView) => void;
}) => (
  <View style={tailwind.style('flex-1 flex-row items-center justify-center gap-4')}>
    {[
      ['checkout', 'PDV'],
      ['orders', 'Pedidos'],
    ].map(([mode, label]) => {
      const isActive = view === mode;
      return (
        <Pressable key={mode} onPress={() => onViewChange(mode as PointOfSaleView)} hitSlop={10}>
          <Text
            style={tailwind.style(
              'text-[17px] leading-[17px] tracking-[0.32px]',
              isActive
                ? 'font-inter-semibold-24 text-gray-950'
                : 'font-inter-normal-20 text-gray-700',
            )}>
            {label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const PointOfSaleHeader = ({
  view,
  onViewChange,
  onSettingsPress,
  onBackPress,
}: {
  view: PointOfSaleView;
  onViewChange: (view: PointOfSaleView) => void;
  onSettingsPress: () => void;
  onBackPress: () => void;
}) => {
  const isSettings = view === 'settings';

  return (
    <View style={tailwind.style('flex-row items-center justify-between px-4 pt-2 pb-3')}>
      <View style={tailwind.style('flex-1 items-start')}>
        {isSettings ? (
          <Pressable onPress={onBackPress} hitSlop={16}>
            <Icon size={24} icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} />
          </Pressable>
        ) : null}
      </View>

      {isSettings ? (
        <View style={tailwind.style('flex-1 items-center')}>
          <Text
            style={tailwind.style(
              'text-[17px] font-inter-semibold-24 leading-[17px] tracking-[0.32px] text-gray-950',
            )}>
            Configurações
          </Text>
        </View>
      ) : (
        <HeaderModeSwitch view={view} onViewChange={onViewChange} />
      )}

      <View style={tailwind.style('flex-1 flex-row items-center justify-end')}>
        {!isSettings ? (
          <Pressable
            onPress={onSettingsPress}
            hitSlop={12}
            style={tailwind.style('h-9 w-9 items-center justify-center rounded-full bg-blackA-A3')}>
            <HeaderSettingsIcon />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const SectionTitle = ({ title, action }: { title: string; action?: string }) => (
  <View style={tailwind.style('flex-row items-center justify-between px-4 pt-5 pb-2')}>
    <Text style={tailwind.style('text-base font-inter-semibold-24 text-gray-950')}>{title}</Text>
    {action ? (
      <Text style={tailwind.style('text-sm font-inter-medium-24 text-blue-800')}>{action}</Text>
    ) : null}
  </View>
);

const ProductRow = ({
  product,
  onPress,
}: {
  product: ProductCatalogProduct;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'mx-4 mb-2 flex-row items-center rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
    )}>
    <View style={tailwind.style('h-10 w-10 items-center justify-center rounded-[8px] bg-blue-50')}>
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          style={tailwind.style('h-10 w-10 rounded-[8px]')}
          resizeMode="cover"
        />
      ) : (
        <Icon icon={<GridIcon />} size={20} />
      )}
    </View>
    <View style={tailwind.style('ml-3 flex-1')}>
      <Text numberOfLines={1} style={tailwind.style('text-sm font-inter-medium-24 text-gray-950')}>
        {product.name}
      </Text>
      <Text
        numberOfLines={1}
        style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-gray-700')}>
        {product.brand || product.collections[0] || product.availability || 'Catálogo XML'}
      </Text>
    </View>
    <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
      {productPriceLabel(product)}
    </Text>
  </Pressable>
);

const AmountKey = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'h-[54px] flex-1 items-center justify-center rounded-[8px] bg-blackA-A3',
    )}>
    <Text style={tailwind.style('text-xl font-inter-medium-24 text-gray-950')}>{label}</Text>
  </Pressable>
);

const CheckoutView = () => {
  const [search, setSearch] = useState('');
  const [manualAmountCents, setManualAmountCents] = useState(0);
  const [products, setProducts] = useState<ProductCatalogProduct[]>([]);
  const [catalogName, setCatalogName] = useState<string | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setIsCatalogLoading(true);
      setCatalogError(null);
      const catalog = await PointOfSaleService.getProductCatalog();
      setProducts(catalog.products);
      setCatalogName(catalog.catalogName || null);
    } catch {
      setProducts([]);
      setCatalogName(null);
      setCatalogError('Não foi possível carregar o feed XML.');
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const appendAmount = (token: string) => {
    setManualAmountCents(current => {
      if (token === '00') return Math.min(current * 100, 999999999);
      return Math.min(current * 10 + Number(token), 999999999);
    });
  };

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['00', '0', 'Apagar'],
  ];

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredProducts = normalizedSearch
      ? products.filter(product =>
          [
            product.name,
            product.brand,
            product.description,
            product.availability,
            product.collections.join(' '),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : products;

    return filteredProducts.slice(0, 3);
  }, [products, search]);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={tailwind.style('pb-28')}>
      <View style={tailwind.style('flex-row items-center pr-4')}>
        <View style={tailwind.style('flex-1')}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch('')}
            placeholder="Buscar produto ou serviço"
          />
        </View>
        <Pressable
          onPress={() => {}}
          hitSlop={8}
          style={tailwind.style('h-9 w-9 items-center justify-center rounded-[11px] bg-blackA-A3')}>
          <Icon icon={<BarcodeScanIcon stroke={tailwind.color('text-gray-950')} />} size={21} />
        </Pressable>
      </View>

      <SectionTitle title="Recentes" action={catalogName || 'Catálogo XML'} />
      {isCatalogLoading ? (
        <Text style={tailwind.style('px-4 py-3 text-sm font-inter-normal-20 text-gray-700')}>
          Carregando produtos...
        </Text>
      ) : null}
      {!isCatalogLoading && catalogError ? (
        <View
          style={tailwind.style(
            'mx-4 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-3',
          )}>
          <Text style={tailwind.style('text-sm font-inter-medium-24 text-amber-900')}>
            {catalogError}
          </Text>
          <Pressable onPress={fetchCatalog} hitSlop={8}>
            <Text style={tailwind.style('pt-2 text-sm font-inter-semibold-24 text-blue-800')}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : null}
      {!isCatalogLoading && !catalogError && visibleProducts.length === 0 ? (
        <Text style={tailwind.style('px-4 py-3 text-sm font-inter-normal-20 text-gray-700')}>
          Nenhum produto encontrado no feed XML.
        </Text>
      ) : null}
      {visibleProducts.map(product => (
        <ProductRow
          key={product.id}
          product={product}
          onPress={() => setManualAmountCents(priceToCents(product.price))}
        />
      ))}

      <View style={tailwind.style('mx-4 mt-4 rounded-[8px] border border-blackA-A3 bg-white')}>
        <View style={tailwind.style('px-4 py-4')}>
          <Text style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>
            Valor manual
          </Text>
          <Text style={tailwind.style('pt-1 text-[34px] font-inter-semibold-24 text-gray-950')}>
            {formatCurrency(manualAmountCents)}
          </Text>
        </View>
        <View style={tailwind.style('gap-2 px-3 pb-3')}>
          {keypadRows.map(row => (
            <View key={row.join('-')} style={tailwind.style('flex-row gap-2')}>
              {row.map(key => (
                <AmountKey
                  key={key}
                  label={key}
                  onPress={() => {
                    if (key === 'Apagar') {
                      setManualAmountCents(current => Math.floor(current / 10));
                      return;
                    }
                    appendAmount(key);
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <Pressable
        style={tailwind.style(
          'mx-4 mt-3 h-12 flex-row items-center justify-center rounded-[8px] bg-blue-800',
          manualAmountCents === 0 ? 'opacity-50' : '',
        )}
        disabled={manualAmountCents === 0}>
        <Icon icon={<AddIcon stroke={tailwind.color('text-white')} />} size={18} />
        <Text style={tailwind.style('ml-2 text-base font-inter-semibold-24 text-white')}>
          Receber
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const OrdersView = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus>('Todos');

  const filteredOrders = useMemo(() => {
    return recentOrders.filter(order => {
      const matchesStatus = status === 'Todos' || order.status === status;
      const matchesSearch = `${order.id} ${order.customer} ${order.source}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [search, status]);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={tailwind.style('pb-28')}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        placeholder="Buscar pedidos"
      />

      <View style={tailwind.style('mt-4 flex-row gap-2 px-4')}>
        {['Relatórios', 'Filtros', 'Detalhes'].map(item => (
          <Pressable
            key={item}
            style={tailwind.style(
              'h-9 flex-1 flex-row items-center justify-center rounded-[8px] bg-blackA-A3',
            )}>
            {item === 'Filtros' ? <Icon icon={<FilterIcon />} size={16} /> : null}
            {item === 'Relatórios' ? <Icon icon={<GridIcon />} size={16} /> : null}
            <Text style={tailwind.style('ml-1 text-sm font-inter-medium-24 text-gray-950')}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tailwind.style('gap-2 px-4 pt-4')}>
        {(['Todos', 'Pago', 'Pendente', 'Cancelado'] as OrderStatus[]).map(item => {
          const isActive = status === item;
          return (
            <Pressable
              key={item}
              onPress={() => setStatus(item)}
              style={tailwind.style(
                'h-8 items-center justify-center rounded-full px-4',
                isActive ? 'bg-blue-800' : 'bg-blackA-A3',
              )}>
              <Text
                style={tailwind.style(
                  'text-sm font-inter-medium-24',
                  isActive ? 'text-white' : 'text-gray-950',
                )}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle title="Pedidos recentes" />
      {filteredOrders.map(order => (
        <View
          key={order.id}
          style={tailwind.style(
            'mx-4 mb-2 rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
          )}>
          <View style={tailwind.style('flex-row items-center justify-between')}>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
              {order.id}
            </Text>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
              {formatCurrency(order.totalCents)}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={tailwind.style('pt-1 text-sm font-inter-medium-24 text-gray-950')}>
            {order.customer}
          </Text>
          <View style={tailwind.style('mt-2 flex-row items-center justify-between')}>
            <Text style={tailwind.style('text-xs font-inter-normal-20 text-gray-700')}>
              {order.source}
            </Text>
            <Text
              style={tailwind.style(
                'text-xs font-inter-semibold-24',
                order.status === 'Pago' ? 'text-green-700' : 'text-amber-800',
              )}>
              {order.status}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const SettingsRow = ({
  title,
  description,
  rightText,
  onPress,
}: {
  title: string;
  description: string;
  rightText?: string;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'mx-4 mb-2 flex-row items-center rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
    )}>
    <View style={tailwind.style('flex-1 pr-3')}>
      <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>{title}</Text>
      <Text
        numberOfLines={2}
        style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-gray-700')}>
        {description}
      </Text>
    </View>
    {rightText ? (
      <Text style={tailwind.style('mr-2 text-xs font-inter-semibold-24 text-blue-800')}>
        {rightText}
      </Text>
    ) : null}
    <Icon icon={<CaretRight />} size={18} />
  </Pressable>
);

const SettingsView = () => {
  const navigation = useNavigation<NavigationProp<RootNavigationParamList>>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 'pix', title: 'Pix', enabled: true },
    { id: 'credit_card', title: 'Cartão', enabled: true },
    { id: 'cash', title: 'Dinheiro', enabled: true },
    { id: 'payment_link', title: 'Link de pagamento', enabled: false },
  ]);

  const togglePaymentMethod = (methodId: string) => {
    setPaymentMethods(current =>
      current.map(method =>
        method.id === methodId ? { ...method, enabled: !method.enabled } : method,
      ),
    );
  };

  return (
    <ScrollView contentContainerStyle={tailwind.style('pb-28')}>
      <SectionTitle title="Formas de recebimento" />
      {paymentMethods.map(method => (
        <Pressable
          key={method.id}
          onPress={() => togglePaymentMethod(method.id)}
          style={tailwind.style(
            'mx-4 mb-2 flex-row items-center justify-between rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
          )}>
          <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
            {method.title}
          </Text>
          <View
            style={tailwind.style(
              'h-7 w-12 justify-center rounded-full px-1',
              method.enabled ? 'items-end bg-blue-800' : 'items-start bg-blackA-A5',
            )}>
            <View style={tailwind.style('h-5 w-5 rounded-full bg-white')} />
          </View>
        </Pressable>
      ))}

      <SectionTitle title="Integrações" />
      {integrations.map(integration => (
        <SettingsRow
          key={integration}
          title={integration}
          description={
            integration === 'Olist' || integration === 'Bling'
              ? 'Pedidos e produtos via API quando conectado.'
              : 'Recebimentos e conciliação de pagamentos.'
          }
          rightText="Configurar"
        />
      ))}

      <SectionTitle title="Catálogo" />
      <SettingsRow
        title="Feed XML"
        description="MVP usando o catálogo já configurado nas integrações do Chatwoot server."
        rightText="Ativo"
      />
      <SettingsRow
        title="Produtos e serviços local"
        description="Cadastro local no Chatwoot server para PDV e agenda."
        rightText="Abrir"
        onPress={() => navigation.navigate('Settings', { screen: 'CatalogItemsScreen' })}
      />
    </ScrollView>
  );
};

export const PointOfSaleScreen = () => {
  const pagerRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [view, setView] = useState<PointOfSaleView>('checkout');
  const [previousView, setPreviousView] = useState<PointOfSaleView>('checkout');

  const handleViewChange = (nextView: PointOfSaleView) => {
    setView(nextView);

    if (nextView === 'checkout' || nextView === 'orders') {
      pagerRef.current?.scrollTo({
        x: nextView === 'orders' ? width : 0,
        animated: true,
      });
    }
  };

  const handleSettingsPress = () => {
    setPreviousView(view);
    setView('settings');
  };

  const handleBackPress = () => {
    handleViewChange(previousView);
  };

  const handlePagerMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setView(pageIndex === 1 ? 'orders' : 'checkout');
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <PointOfSaleHeader
        view={view}
        onViewChange={handleViewChange}
        onSettingsPress={handleSettingsPress}
        onBackPress={handleBackPress}
      />
      {view !== 'settings' ? (
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={handlePagerMomentumEnd}
          style={tailwind.style('flex-1')}
          contentContainerStyle={tailwind.style('flex-row')}>
          <View style={[tailwind.style('flex-1'), { width }]}>
            <CheckoutView />
          </View>
          <View style={[tailwind.style('flex-1'), { width }]}>
            <OrdersView />
          </View>
        </ScrollView>
      ) : null}
      {view === 'settings' ? <SettingsView /> : null}
    </SafeAreaView>
  );
};
