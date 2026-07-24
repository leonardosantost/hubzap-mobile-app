import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  Alert,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AxiosError } from 'axios';

import {
  Avatar,
  BottomSheetBackdrop,
  BottomSheetHeader,
  Icon,
  SearchBar,
  Spinner,
} from '@/components-next';
import {
  AddIcon,
  BarcodeScanIcon,
  CaretRight,
  CartIcon,
  TickIcon,
  ChevronLeft,
  FilterIcon,
  GridIcon,
  SettingsIconOutline,
  Trash,
  UserIcon,
} from '@/svg-icons';
import { PointOfSaleService } from '@/store/point-of-sale/pointOfSaleService';
import type {
  PosOrder,
  PosOrderInput,
  PosOrderPaymentStatus,
  ProductCatalogProduct,
} from '@/store/point-of-sale/pointOfSaleService';
import {
  MercadoPagoPaymentResponse,
  MercadoPagoService,
} from '@/store/mercado-pago/mercadoPagoService';
import { TaskService } from '@/store/task/taskService';
import { conversationActions } from '@/store/conversation/conversationActions';
import { selectUserId, selectUserThumbnail } from '@/store/auth/authSelectors';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { tailwind } from '@/theme';
import type { Contact } from '@/types';
import { openURL } from '@/utils/urlUtils';
import { showToast } from '@/utils/toastUtils';
import { useTabBarHeight } from '@/utils';

type PointOfSaleView = 'metrics' | 'checkout' | 'orders' | 'settings';
type OrderStatus = 'Todos' | 'Pago' | 'Pendente' | 'Cancelado';
type MathOperator = '+' | '-' | '×' | '÷';
type CheckoutStep = 'cart' | 'payment' | 'summary';
type RootNavigationParamList = {
  Settings: { screen: 'CatalogItemsScreen' };
};

export type PointOfSaleRouteParams = {
  conversationId?: number;
  contactId?: number;
  contactName?: string;
  contactThumbnail?: string;
};

type PointOfSaleContext = {
  conversationId?: number;
  contactId?: number;
  contactName: string;
  contactThumbnail?: string;
};

type PaymentMethod = {
  id: string;
  title: string;
  enabled: boolean;
};

type PaymentCharge = MercadoPagoPaymentResponse & {
  kind: 'pix' | 'payment_link';
};

type CartItem = {
  product: ProductCatalogProduct;
  quantity: number;
  customName?: string;
  notes?: string;
};

type SaleOrderDetails = {
  contactId?: number;
  contactName: string;
  contactEmail?: string;
  discountCents: number;
  shippingCents: number;
  finalTotalCents: number;
  notes: string;
};

type SaleOrderAction = 'draft' | 'finish' | 'charge';

const temporaryCartsByContext = new Map<string, CartItem[]>();

const integrations = ['Mercado Pago', 'Asaas', 'Olist', 'Bling'];

const defaultPaymentMethods: PaymentMethod[] = [
  { id: 'pix', title: 'Pix', enabled: true },
  { id: 'credit_card', title: 'Cartão', enabled: true },
  { id: 'cash', title: 'Dinheiro', enabled: true },
  { id: 'payment_link', title: 'Link de pagamento', enabled: true },
];

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

const centsToPrice = (valueInCents: number) => (valueInCents / 100).toFixed(2);

const currencyInputToCents = (value: string) => {
  const normalizedValue = value.replace(/[^\d,.]/g, '').replace(',', '.');
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? Math.round(parsedValue * 100) : 0;
};

const productPriceLabel = (product: ProductCatalogProduct) => {
  const priceCents = priceToCents(product.price);
  if (!priceCents) return 'Sem preço';
  if (!product.currency || product.currency === 'BRL') return formatCurrency(priceCents);

  return [product.currency, product.price].filter(Boolean).join(' ');
};

const paymentStatusLabel = (status: PosOrderPaymentStatus) => {
  const labels: Record<PosOrderPaymentStatus, string> = {
    unpaid: 'Não pago',
    pending: 'Pendente',
    paid: 'Pago',
    failed: 'Falhou',
    refunded: 'Estornado',
    expired: 'Expirado',
  };

  return labels[status] || 'Pendente';
};

const paymentMethodLabel = (method?: string | null) => {
  if (!method) return 'Pedido manual';

  const labels: Record<string, string> = {
    pix: 'Pix',
    credit_card: 'Cartão',
    cash: 'Dinheiro',
    payment_link: 'Link de pagamento',
  };

  return labels[method] || method;
};

const statusFilterMatches = (order: PosOrder, status: OrderStatus) => {
  if (status === 'Todos') return true;
  if (status === 'Pago') return order.paymentStatus === 'paid';
  if (status === 'Cancelado') return order.status === 'cancelled';

  return ['unpaid', 'pending'].includes(order.paymentStatus) && order.status !== 'cancelled';
};

const buildOrderSummaryMessage = ({
  cartItems,
  paymentMethod,
  subtotalCents,
  discountCents,
  shippingCents,
  finalTotalCents,
  notes,
  paymentCharge,
}: {
  cartItems: CartItem[];
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  finalTotalCents: number;
  notes: string;
  paymentCharge?: PaymentCharge | null;
}) => {
  const itemLines = cartItems.map(item => {
    const itemTotalCents = priceToCents(item.product.price) * item.quantity;
    return `- ${item.quantity}x ${item.customName || item.product.name}: ${formatCurrency(itemTotalCents)}`;
  });

  return [
    'Resumo do pedido',
    '',
    ...itemLines,
    '',
    `Subtotal: ${formatCurrency(subtotalCents)}`,
    discountCents > 0 ? `Desconto: -${formatCurrency(discountCents)}` : null,
    shippingCents > 0 ? `Frete: ${formatCurrency(shippingCents)}` : null,
    `Forma de pagamento: ${paymentMethod.title}`,
    `Total: ${formatCurrency(finalTotalCents)}`,
    paymentCharge?.checkout_url ? '' : null,
    paymentCharge?.checkout_url ? `Link de pagamento: ${paymentCharge.checkout_url}` : null,
    paymentCharge?.qr_code ? '' : null,
    paymentCharge?.qr_code ? `Pix copia e cola: ${paymentCharge.qr_code}` : null,
    notes.trim() ? '' : null,
    notes.trim() ? `Observações: ${notes.trim()}` : null,
  ]
    .filter(line => line !== null)
    .join('\n');
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
  <View style={tailwind.style('self-stretch flex-row items-center justify-center gap-5')}>
    {[
      ['metrics', 'Métricas'],
      ['checkout', 'PDV'],
      ['orders', 'Pedidos'],
    ].map(([mode, label]) => {
      const isActive = view === mode;
      return (
        <Pressable key={mode} onPress={() => onViewChange(mode as PointOfSaleView)} hitSlop={10}>
          <Text
            style={tailwind.style(
              'text-[17px] leading-[22px] tracking-[0.32px]',
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
  context,
}: {
  view: PointOfSaleView;
  onViewChange: (view: PointOfSaleView) => void;
  onSettingsPress: () => void;
  onBackPress: () => void;
  context?: PointOfSaleContext;
}) => {
  const isSettings = view === 'settings';
  const isContextual = !!context;

  return (
    <View
      style={tailwind.style('min-h-[62px] flex-row items-center justify-between px-4 pt-2 pb-3')}>
      <View style={tailwind.style('w-10 items-start')}>
        {isSettings || isContextual ? (
          <Pressable onPress={onBackPress} hitSlop={16}>
            <Icon size={24} icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} />
          </Pressable>
        ) : null}
      </View>

      {isSettings ? (
        <View style={tailwind.style('flex-1 items-stretch px-1')}>
          <Text
            style={tailwind.style(
              'text-[17px] font-inter-semibold-24 leading-[17px] tracking-[0.32px] text-gray-950',
            )}>
            Configurações
          </Text>
        </View>
      ) : (
        <View style={tailwind.style('flex-1 items-stretch px-1')}>
          <HeaderModeSwitch view={view} onViewChange={onViewChange} />
          {isContextual ? (
            <Text
              numberOfLines={1}
              style={tailwind.style('mt-1 text-center text-xs font-inter-normal-20 text-gray-700')}>
              {context.contactName}
            </Text>
          ) : null}
        </View>
      )}

      <View style={tailwind.style('w-10 flex-row items-center justify-end')}>
        {!isSettings && !isContextual ? (
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

const CartItemRow = ({
  item,
  onPress,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  onPress: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) => {
  const unitPriceCents = priceToCents(item.product.price);
  const totalCents = unitPriceCents * item.quantity;
  const displayName = item.customName || item.product.name;

  return (
    <Pressable
      onPress={onPress}
      style={tailwind.style(
        'mx-4 mb-2 flex-row items-center rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
      )}>
      <View
        style={tailwind.style('h-10 w-10 items-center justify-center rounded-[8px] bg-blue-50')}>
        {item.product.imageUrl ? (
          <Image
            source={{ uri: item.product.imageUrl }}
            style={tailwind.style('h-10 w-10 rounded-[8px]')}
            resizeMode="cover"
          />
        ) : (
          <Icon icon={<GridIcon />} size={20} />
        )}
      </View>
      <View style={tailwind.style('ml-3 flex-1 pr-2')}>
        <Text
          numberOfLines={1}
          style={tailwind.style('text-sm font-inter-medium-24 text-gray-950')}>
          {displayName}
        </Text>
        <Text
          numberOfLines={1}
          style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-gray-700')}>
          {item.notes || productPriceLabel(item.product)}
        </Text>
      </View>
      <View style={tailwind.style('items-end')}>
        <View style={tailwind.style('mb-2 flex-row items-center gap-2')}>
          <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
            {formatCurrency(totalCents)}
          </Text>
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={tailwind.style('h-7 w-7 items-center justify-center rounded-full bg-red-50')}>
            <Icon icon={<Trash />} size={15} />
          </Pressable>
        </View>
        <View style={tailwind.style('flex-row items-center rounded-full bg-blackA-A3 p-0.5')}>
          <Pressable
            onPress={onDecrement}
            hitSlop={8}
            style={tailwind.style('h-7 w-7 items-center justify-center rounded-full bg-white')}>
            <Text style={tailwind.style('text-lg leading-[20px] text-gray-950')}>-</Text>
          </Pressable>
          <Text
            style={tailwind.style(
              'min-w-[28px] text-center text-sm font-inter-semibold-24 text-gray-950',
            )}>
            {item.quantity}
          </Text>
          <Pressable
            onPress={onIncrement}
            hitSlop={8}
            style={tailwind.style('h-7 w-7 items-center justify-center rounded-full bg-blue-800')}>
            <Icon icon={<AddIcon stroke={tailwind.color('text-white')} />} size={14} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const AmountKey = ({
  label,
  variant = 'default',
  onPress,
}: {
  label: string;
  variant?: 'default' | 'operator' | 'danger';
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'h-[54px] flex-1 items-center justify-center rounded-[8px] bg-blackA-A3',
      variant === 'operator' ? 'bg-blue-50' : '',
      variant === 'danger' ? 'bg-red-50' : '',
    )}>
    <Text
      style={tailwind.style(
        'text-xl font-inter-medium-24 text-gray-950',
        variant === 'operator' ? 'text-blue-800' : '',
        variant === 'danger' ? 'text-red-700' : '',
      )}>
      {label}
    </Text>
  </Pressable>
);

const CompactHeader = ({ title, onBackPress }: { title: string; onBackPress: () => void }) => (
  <View style={tailwind.style('flex-row items-center px-4 pt-1 pb-3')}>
    <Pressable onPress={onBackPress} hitSlop={16}>
      <Icon size={24} icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} />
    </Pressable>
    <Text
      numberOfLines={1}
      style={tailwind.style('ml-3 flex-1 text-lg font-inter-semibold-24 text-gray-950')}>
      {title}
    </Text>
  </View>
);

const PaymentMethodSelectionView = ({
  methods,
  totalCents,
  tabBarHeight,
  showBackHeader = true,
  onBackPress,
  onSelectMethod,
}: {
  methods: PaymentMethod[];
  totalCents: number;
  tabBarHeight: number;
  showBackHeader?: boolean;
  onBackPress: () => void;
  onSelectMethod: (method: PaymentMethod) => void;
}) => {
  const activeMethods = methods.filter(method => method.enabled);

  return (
    <View style={tailwind.style('flex-1')}>
      {showBackHeader ? (
        <CompactHeader title="Forma de pagamento" onBackPress={onBackPress} />
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 96 }}>
        <View style={tailwind.style('mx-4 mb-3 rounded-[8px] bg-blue-50 px-4 py-4')}>
          <Text style={tailwind.style('text-sm font-inter-normal-20 text-blue-900')}>
            Total da venda
          </Text>
          <Text style={tailwind.style('pt-1 text-[28px] font-inter-semibold-24 text-blue-950')}>
            {formatCurrency(totalCents)}
          </Text>
        </View>

        <SectionTitle title="Selecione uma forma ativa" />
        {activeMethods.map(method => (
          <Pressable
            key={method.id}
            onPress={() => onSelectMethod(method)}
            style={tailwind.style(
              'mx-4 mb-2 flex-row items-center rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
            )}>
            <View
              style={tailwind.style(
                'h-10 w-10 items-center justify-center rounded-[8px] bg-blackA-A3',
              )}>
              <Icon icon={<CartIcon />} size={20} />
            </View>
            <Text
              style={tailwind.style('ml-3 flex-1 text-sm font-inter-semibold-24 text-gray-950')}>
              {method.title}
            </Text>
            <Icon icon={<CaretRight />} size={18} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const SummaryValueRow = ({
  title,
  value,
  tone = 'default',
}: {
  title: string;
  value: string;
  tone?: 'default' | 'discount' | 'total';
}) => (
  <View style={tailwind.style('flex-row items-center justify-between py-1.5')}>
    <Text style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>{title}</Text>
    <Text
      style={tailwind.style(
        'text-sm font-inter-semibold-24 text-gray-950',
        tone === 'discount' ? 'text-red-700' : '',
        tone === 'total' ? 'text-base text-blue-900' : '',
      )}>
      {value}
    </Text>
  </View>
);

const SaleSummaryView = ({
  cartItems,
  paymentMethod,
  totalCents,
  tabBarHeight,
  context,
  showBackHeader = true,
  onBackPress,
  onSendSummary,
  onSaveForLater,
  onFinish,
  onEnsureOrder,
}: {
  cartItems: CartItem[];
  paymentMethod: PaymentMethod;
  totalCents: number;
  tabBarHeight: number;
  context?: PointOfSaleContext;
  showBackHeader?: boolean;
  onBackPress: () => void;
  onSendSummary: (message: string) => Promise<void>;
  onSaveForLater: (details: SaleOrderDetails) => Promise<void>;
  onFinish: (details: SaleOrderDetails) => Promise<void>;
  onEnsureOrder: (details: SaleOrderDetails, action: SaleOrderAction) => Promise<PosOrder>;
}) => {
  const defaultContactName = context?.contactName || 'Consumidor final';
  const [contactSearch, setContactSearch] = useState(defaultContactName);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [discount, setDiscount] = useState('');
  const [shipping, setShipping] = useState('');
  const [notes, setNotes] = useState('');
  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [isGeneratingCharge, setIsGeneratingCharge] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [paymentCharge, setPaymentCharge] = useState<PaymentCharge | null>(null);
  const [savedOrder, setSavedOrder] = useState<PosOrder | null>(null);

  useEffect(() => {
    const query = contactSearch.trim();
    if (selectedContact || query === defaultContactName || query.length < 2) {
      setContactResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await TaskService.searchContacts(query);
        setContactResults(results.slice(0, 6));
      } catch {
        setContactResults([]);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [contactSearch, defaultContactName, selectedContact]);

  const discountCents = currencyInputToCents(discount);
  const shippingCents = currencyInputToCents(shipping);
  const finalTotalCents = Math.max(totalCents - discountCents + shippingCents, 0);
  const orderSummaryMessage = buildOrderSummaryMessage({
    cartItems,
    paymentMethod,
    subtotalCents: totalCents,
    discountCents,
    shippingCents,
    finalTotalCents,
    notes,
    paymentCharge,
  });

  const orderDetails = useMemo<SaleOrderDetails>(
    () => ({
      contactId: selectedContact?.id || context?.contactId,
      contactName: contactSearch.trim() || defaultContactName,
      contactEmail: selectedContact?.email || undefined,
      discountCents,
      shippingCents,
      finalTotalCents,
      notes,
    }),
    [
      contactSearch,
      context?.contactId,
      defaultContactName,
      discountCents,
      finalTotalCents,
      notes,
      selectedContact?.email,
      selectedContact?.id,
      shippingCents,
    ],
  );

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactSearch(contact.name || contact.email || contact.phoneNumber || '');
    setContactResults([]);
  };

  const handleSendSummaryPress = async () => {
    if (isSendingSummary) return;

    setIsSendingSummary(true);
    try {
      await onSendSummary(orderSummaryMessage);
    } finally {
      setIsSendingSummary(false);
    }
  };

  const canGenerateMercadoPagoCharge =
    paymentMethod.id === 'pix' || paymentMethod.id === 'payment_link';

  const handleGenerateChargePress = async () => {
    if (!canGenerateMercadoPagoCharge || isGeneratingCharge) return;

    setIsGeneratingCharge(true);
    try {
      const order = await onEnsureOrder(orderDetails, 'charge');
      setSavedOrder(order);
      const charge = await MercadoPagoService.createPayment({
        kind: paymentMethod.id === 'pix' ? 'pix' : 'payment_link',
        amount_cents: finalTotalCents,
        description: `Pedido ${formatCurrency(finalTotalCents)}`,
        contact_id: selectedContact?.id || context?.contactId,
        contact_name: contactSearch.trim() || defaultContactName,
        contact_email: selectedContact?.email || undefined,
        conversation_id: context?.conversationId,
        pos_order_id: order.id,
        notes,
        items: cartItems.map(item => ({
          id: item.product.id,
          title: item.customName || item.product.name,
          quantity: item.quantity,
          unit_price_cents: priceToCents(item.product.price),
        })),
      });
      setPaymentCharge({ ...charge, kind: paymentMethod.id === 'pix' ? 'pix' : 'payment_link' });
      showToast({ message: paymentMethod.id === 'pix' ? 'Pix gerado.' : 'Link gerado.' });
    } catch (error) {
      const serverError = ((error as AxiosError).response?.data as { error?: string })?.error;
      Alert.alert(
        'Falha ao gerar cobrança',
        serverError || 'Verifique se o Mercado Pago está conectado nas integrações.',
      );
    } finally {
      setIsGeneratingCharge(false);
    }
  };

  const handleSaveForLaterPress = async () => {
    if (isSavingOrder) return;

    setIsSavingOrder(true);
    try {
      const order = await onEnsureOrder(orderDetails, 'draft');
      setSavedOrder(order);
      await onSaveForLater(orderDetails);
    } catch (error) {
      const serverError = ((error as AxiosError).response?.data as { error?: string })?.error;
      Alert.alert('Falha ao salvar pedido', serverError || 'Não foi possível salvar o pedido.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleFinishPress = async () => {
    if (isSavingOrder) return;

    setIsSavingOrder(true);
    try {
      const order = await onEnsureOrder(orderDetails, 'finish');
      setSavedOrder(order);
      await onFinish(orderDetails);
    } catch (error) {
      const serverError = ((error as AxiosError).response?.data as { error?: string })?.error;
      Alert.alert('Falha ao finalizar venda', serverError || 'Não foi possível finalizar a venda.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const copyChargeValue = () => {
    const value = paymentCharge?.checkout_url || paymentCharge?.qr_code;
    if (!value) return;

    Clipboard.setString(value);
    showToast({ message: 'Copiado.' });
  };

  return (
    <View style={tailwind.style('flex-1')}>
      {showBackHeader ? <CompactHeader title="Resumo do pedido" onBackPress={onBackPress} /> : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: tabBarHeight + (context?.conversationId ? 170 : 112),
        }}>
        <SectionTitle title="Contato" />
        <View
          style={tailwind.style('mx-4 rounded-[8px] border border-blackA-A3 bg-white px-3 py-3')}>
          <View style={tailwind.style('flex-row items-center')}>
            {selectedContact || context?.contactThumbnail ? (
              <Avatar
                size="md"
                name={selectedContact?.name || context?.contactName || ''}
                src={
                  selectedContact?.thumbnail
                    ? { uri: selectedContact.thumbnail }
                    : context?.contactThumbnail
                      ? { uri: context.contactThumbnail }
                      : undefined
                }
              />
            ) : (
              <View
                style={tailwind.style(
                  'h-9 w-9 items-center justify-center rounded-full bg-blackA-A3',
                )}>
                <Icon icon={<UserIcon />} size={18} />
              </View>
            )}
            <TextInput
              value={contactSearch}
              selectTextOnFocus
              onChangeText={text => {
                setSelectedContact(null);
                setContactSearch(text);
              }}
              onBlur={() => {
                if (!contactSearch.trim()) {
                  setContactSearch(defaultContactName);
                }
              }}
              placeholder="Selecionar contato"
              placeholderTextColor={tailwind.color('text-gray-500')}
              style={tailwind.style('ml-3 flex-1 text-base font-inter-normal-20 text-gray-950')}
            />
          </View>
          {contactResults.map(contact => (
            <Pressable
              key={contact.id}
              onPress={() => selectContact(contact)}
              style={tailwind.style('mt-3 flex-row items-center border-t border-blackA-A3 pt-3')}>
              <Avatar
                size="md"
                name={contact.name || ''}
                src={contact.thumbnail ? { uri: contact.thumbnail } : undefined}
              />
              <View style={tailwind.style('ml-3 flex-1')}>
                <Text
                  numberOfLines={1}
                  style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
                  {contact.name || 'Contato sem nome'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={tailwind.style('text-xs font-inter-normal-20 text-gray-700')}>
                  {contact.phoneNumber || contact.email || 'Sem telefone'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <SectionTitle title="Itens" action={`${cartItems.length} produtos`} />
        {cartItems.map(item => (
          <View
            key={item.product.id}
            style={tailwind.style(
              'mx-4 mb-2 flex-row items-center justify-between rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
            )}>
            <View style={tailwind.style('flex-1 pr-3')}>
              <Text
                numberOfLines={1}
                style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
                {item.customName || item.product.name}
              </Text>
              <Text style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-gray-700')}>
                {item.quantity} x {productPriceLabel(item.product)}
              </Text>
            </View>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
              {formatCurrency(priceToCents(item.product.price) * item.quantity)}
            </Text>
          </View>
        ))}

        <SectionTitle title="Ajustes" />
        <View
          style={tailwind.style('mx-4 rounded-[8px] border border-blackA-A3 bg-white px-3 py-3')}>
          <View style={tailwind.style('flex-row gap-2')}>
            <View style={tailwind.style('flex-1')}>
              <Text style={tailwind.style('mb-1 text-xs font-inter-medium-24 text-gray-700')}>
                Desconto
              </Text>
              <TextInput
                value={discount}
                onChangeText={setDiscount}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                placeholder="0,00"
                placeholderTextColor={tailwind.color('text-gray-500')}
                style={tailwind.style(
                  'h-11 rounded-[8px] border border-blackA-A3 px-3 text-base text-gray-950',
                )}
              />
            </View>
            <View style={tailwind.style('flex-1')}>
              <Text style={tailwind.style('mb-1 text-xs font-inter-medium-24 text-gray-700')}>
                Frete
              </Text>
              <TextInput
                value={shipping}
                onChangeText={setShipping}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                placeholder="0,00"
                placeholderTextColor={tailwind.color('text-gray-500')}
                style={tailwind.style(
                  'h-11 rounded-[8px] border border-blackA-A3 px-3 text-base text-gray-950',
                )}
              />
            </View>
          </View>
          <Text style={tailwind.style('mt-4 mb-1 text-xs font-inter-medium-24 text-gray-700')}>
            Observações
          </Text>
          <TextInput
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Adicionar observações"
            placeholderTextColor={tailwind.color('text-gray-500')}
            style={tailwind.style(
              'min-h-[88px] rounded-[8px] border border-blackA-A3 px-3 py-3 text-base text-gray-950',
            )}
          />
        </View>

        <SectionTitle title="Pagamento" />
        <View
          style={tailwind.style('mx-4 rounded-[8px] border border-blackA-A3 bg-white px-4 py-3')}>
          <SummaryValueRow title="Forma" value={paymentMethod.title} />
          <SummaryValueRow title="Subtotal" value={formatCurrency(totalCents)} />
          <SummaryValueRow
            title="Desconto"
            value={`-${formatCurrency(discountCents)}`}
            tone="discount"
          />
          <SummaryValueRow title="Frete" value={formatCurrency(shippingCents)} />
          <View style={tailwind.style('mt-2 border-t border-blackA-A3 pt-2')}>
            <SummaryValueRow title="Total" value={formatCurrency(finalTotalCents)} tone="total" />
          </View>
        </View>

        {canGenerateMercadoPagoCharge ? (
          <View
            style={tailwind.style(
              'mx-4 mt-3 rounded-[8px] border border-blue-100 bg-blue-50 px-4 py-3',
            )}>
            <View style={tailwind.style('flex-row items-center justify-between')}>
              <View style={tailwind.style('flex-1 pr-3')}>
                <Text style={tailwind.style('text-sm font-inter-semibold-24 text-blue-950')}>
                  {paymentMethod.id === 'pix' ? 'Cobrança Pix' : 'Link de pagamento'}
                </Text>
                <Text style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-blue-900')}>
                  {paymentCharge
                    ? 'Pronto para copiar ou enviar ao cliente.'
                    : savedOrder
                      ? `Vinculado ao pedido #${savedOrder.id}.`
                      : 'Gerado com a conta Mercado Pago conectada.'}
                </Text>
              </View>
              <Pressable
                onPress={handleGenerateChargePress}
                disabled={isGeneratingCharge}
                style={tailwind.style(
                  'h-9 items-center justify-center rounded-[8px] bg-blue-800 px-3',
                  isGeneratingCharge ? 'opacity-80' : '',
                )}>
                {isGeneratingCharge ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={tailwind.style('text-xs font-inter-semibold-24 text-white')}>
                    {paymentCharge ? 'Gerar novo' : 'Gerar'}
                  </Text>
                )}
              </Pressable>
            </View>

            {paymentCharge ? (
              <View style={tailwind.style('mt-3 rounded-[8px] bg-white px-3 py-3')}>
                <Text
                  numberOfLines={paymentCharge.checkout_url ? 2 : 3}
                  style={tailwind.style('text-xs font-inter-normal-20 text-gray-800')}>
                  {paymentCharge.checkout_url || paymentCharge.qr_code}
                </Text>
                <View style={tailwind.style('mt-3 flex-row gap-2')}>
                  <Pressable
                    onPress={copyChargeValue}
                    style={tailwind.style(
                      'h-9 flex-1 items-center justify-center rounded-[8px] border border-blue-800 bg-white',
                    )}>
                    <Text style={tailwind.style('text-xs font-inter-semibold-24 text-blue-800')}>
                      Copiar
                    </Text>
                  </Pressable>
                  {paymentCharge.checkout_url ? (
                    <Pressable
                      onPress={() => openURL({ URL: paymentCharge.checkout_url || '' })}
                      style={tailwind.style(
                        'h-9 flex-1 items-center justify-center rounded-[8px] bg-blue-800',
                      )}>
                      <Text style={tailwind.style('text-xs font-inter-semibold-24 text-white')}>
                        Abrir
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          tailwind.style(
            'absolute left-0 right-0 border-t border-blackA-A3 bg-white px-4 pt-3 pb-3',
          ),
          { bottom: tabBarHeight },
        ]}>
        {context?.conversationId ? (
          <Pressable
            onPress={handleSendSummaryPress}
            disabled={isSendingSummary}
            style={tailwind.style(
              'mb-2 h-12 flex-row items-center justify-center rounded-[8px] bg-green-700',
              isSendingSummary ? 'opacity-80' : '',
            )}>
            {isSendingSummary ? (
              <Spinner
                size={16}
                stroke={tailwind.color('text-white')}
                style={tailwind.style('mr-2')}
              />
            ) : null}
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-white')}>
              {isSendingSummary ? 'Enviando resumo...' : 'Enviar resumo pro cliente'}
            </Text>
          </Pressable>
        ) : null}
        <View style={tailwind.style('flex-row gap-2')}>
          <Pressable
            onPress={handleSaveForLaterPress}
            disabled={isSavingOrder}
            style={tailwind.style(
              'h-12 flex-1 flex-row items-center justify-center rounded-[8px] border border-blue-800 bg-white',
              isSavingOrder ? 'opacity-70' : '',
            )}>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-blue-800')}>
              Salvar para depois
            </Text>
          </Pressable>
          <Pressable
            onPress={handleFinishPress}
            disabled={isSavingOrder}
            style={tailwind.style(
              'h-12 flex-1 flex-row items-center justify-center rounded-[8px] bg-blue-800',
              isSavingOrder ? 'opacity-70' : '',
            )}>
            {isSavingOrder ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Icon icon={<TickIcon stroke={tailwind.color('text-white')} />} size={18} />
            )}
            <Text style={tailwind.style('ml-2 text-sm font-inter-semibold-24 text-white')}>
              {isSavingOrder ? 'Salvando...' : 'Finalizar venda'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const CheckoutView = ({
  context,
  checkoutStep,
  onCheckoutStepChange,
}: {
  context?: PointOfSaleContext;
  checkoutStep: CheckoutStep;
  onCheckoutStepChange: (step: CheckoutStep) => void;
}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const userThumbnail = useAppSelector(selectUserThumbnail);
  const tabBarHeight = useTabBarHeight();
  const bottomOffset = context ? 12 : tabBarHeight;
  const editCartItemSheetRef = useRef<BottomSheetModal>(null);
  const contextCartKey = useMemo(() => {
    if (!context?.conversationId && !context?.contactId) return null;
    return context.conversationId
      ? `conversation:${context.conversationId}`
      : `contact:${context.contactId}`;
  }, [context?.contactId, context?.conversationId]);
  const [search, setSearch] = useState('');
  const [manualAmountCents, setManualAmountCents] = useState(0);
  const [calculationBaseCents, setCalculationBaseCents] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<MathOperator | null>(null);
  const [products, setProducts] = useState<ProductCatalogProduct[]>([]);
  const [catalogName, setCatalogName] = useState<string | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    contextCartKey ? (temporaryCartsByContext.get(contextCartKey) ?? []) : [],
  );
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [currentOrder, setCurrentOrder] = useState<PosOrder | null>(null);

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

  useEffect(() => {
    setCartItems(contextCartKey ? (temporaryCartsByContext.get(contextCartKey) ?? []) : []);
  }, [contextCartKey]);

  useEffect(() => {
    if (contextCartKey) {
      temporaryCartsByContext.set(contextCartKey, cartItems);
    }
    setCurrentOrder(null);
  }, [cartItems, contextCartKey]);

  const appendAmount = (token: string) => {
    setManualAmountCents(current => {
      if (token === '00') return Math.min(current * 100, 999999999);
      return Math.min(current * 10 + Number(token), 999999999);
    });
  };

  const keypadRows: string[][] = [
    ['1', '2', '3', '+'],
    ['4', '5', '6', '-'],
    ['7', '8', '9', '×'],
    ['00', '0', 'Apagar', '÷'],
    ['C', '='],
  ];

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return [];

    return products
      .filter(product =>
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
      .slice(0, 5);
  }, [products, search]);

  const cartTotalCents = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + priceToCents(item.product.price) * item.quantity,
        0,
      ),
    [cartItems],
  );

  const cartItemsCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );

  const fixedButtonLabel =
    manualAmountCents > 0
      ? `Adicionar ${formatCurrency(manualAmountCents)}`
      : `Receber ${cartTotalCents > 0 ? formatCurrency(cartTotalCents) : ''}`;
  const isFixedButtonDisabled = manualAmountCents === 0 && cartTotalCents === 0;

  const addProductToCart = (product: ProductCatalogProduct) => {
    setCartItems(currentItems => {
      const existingItem = currentItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return currentItems.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...currentItems, { product, quantity: 1 }];
    });
    setSearch('');
  };

  const openCartItemEditor = (item: CartItem) => {
    setEditingProductId(item.product.id);
    setEditingName(item.customName || item.product.name);
    setEditingNotes(item.notes || '');
    editCartItemSheetRef.current?.present();
  };

  const saveCartItemEditor = () => {
    if (!editingProductId) return;
    setCartItems(currentItems =>
      currentItems.map(item =>
        item.product.id === editingProductId
          ? {
              ...item,
              customName: editingName.trim() || item.product.name,
              notes: editingNotes.trim() || undefined,
            }
          : item,
      ),
    );
    editCartItemSheetRef.current?.dismiss();
  };

  const incrementCartItem = (productId: string) => {
    setCartItems(currentItems =>
      currentItems.map(item =>
        item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decrementCartItem = (productId: string) => {
    setCartItems(currentItems =>
      currentItems
        .map(item =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter(item => item.quantity > 0),
    );
  };

  const removeCartItem = (productId: string) => {
    setCartItems(currentItems => currentItems.filter(item => item.product.id !== productId));
  };

  const calculateResult = (baseCents: number, currentCents: number, operator: MathOperator) => {
    switch (operator) {
      case '+':
        return baseCents + currentCents;
      case '-':
        return Math.max(baseCents - currentCents, 0);
      case '×':
        return Math.round((baseCents * currentCents) / 100);
      case '÷':
        return currentCents > 0 ? Math.round((baseCents * 100) / currentCents) : baseCents;
      default:
        return currentCents;
    }
  };

  const handleOperatorPress = (operator: MathOperator) => {
    if (pendingOperator && calculationBaseCents !== null) {
      setCalculationBaseCents(
        calculateResult(calculationBaseCents, manualAmountCents, pendingOperator),
      );
    } else {
      setCalculationBaseCents(manualAmountCents);
    }
    setPendingOperator(operator);
    setManualAmountCents(0);
  };

  const handleEqualsPress = () => {
    if (!pendingOperator || calculationBaseCents === null) return;
    setManualAmountCents(calculateResult(calculationBaseCents, manualAmountCents, pendingOperator));
    setCalculationBaseCents(null);
    setPendingOperator(null);
  };

  const clearManualAmount = () => {
    setManualAmountCents(0);
    setCalculationBaseCents(null);
    setPendingOperator(null);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'Apagar') {
      setManualAmountCents(current => Math.floor(current / 10));
      return;
    }
    if (key === 'C') {
      clearManualAmount();
      return;
    }
    if (key === '=') {
      handleEqualsPress();
      return;
    }
    if (['+', '-', '×', '÷'].includes(key)) {
      handleOperatorPress(key as MathOperator);
      return;
    }
    appendAmount(key);
  };

  const addManualAmountToCart = () => {
    if (manualAmountCents === 0) return;
    const customProduct: ProductCatalogProduct = {
      id: `custom-${Date.now()}`,
      name: 'Produto personalizado',
      price: centsToPrice(manualAmountCents),
      currency: 'BRL',
      images: [],
      collections: ['Manual'],
    };

    setCartItems(currentItems => [...currentItems, { product: customProduct, quantity: 1 }]);
    clearManualAmount();
  };

  const handleFixedButtonPress = () => {
    if (manualAmountCents > 0) {
      addManualAmountToCart();
      return;
    }
    onCheckoutStepChange('payment');
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    onCheckoutStepChange('summary');
  };

  const buildOrderInput = useCallback(
    (details: SaleOrderDetails, action: SaleOrderAction): PosOrderInput => {
      const shouldWaitForProvider =
        action === 'charge' ||
        selectedPaymentMethod?.id === 'pix' ||
        selectedPaymentMethod?.id === 'payment_link';

      return {
        contactId: details.contactId,
        conversationId: context?.conversationId,
        customerName: details.contactName,
        status: action === 'draft' ? 'draft' : action === 'finish' ? 'completed' : 'open',
        paymentStatus: action === 'draft' ? 'unpaid' : shouldWaitForProvider ? 'pending' : 'paid',
        paymentMethod: selectedPaymentMethod?.id,
        paymentProvider: shouldWaitForProvider ? 'mercado_pago' : undefined,
        discountCents: details.discountCents,
        shippingCents: details.shippingCents,
        currency: 'BRL',
        notes: details.notes,
        items: cartItems.map((item, index) => ({
          id: currentOrder?.items[index]?.id,
          name: item.customName || item.product.name,
          description: item.notes || item.product.description,
          quantity: item.quantity,
          unitPriceCents: priceToCents(item.product.price),
          currency: item.product.currency || 'BRL',
          metadata: {
            product_id: item.product.id,
            retailer_id: item.product.retailerId,
            source: item.product.id.toString().startsWith('custom-') ? 'manual' : 'catalog',
          },
        })),
        metadata: {
          contact_email: details.contactEmail,
          source: context?.conversationId ? 'conversation_pos' : 'mobile_pos',
        },
      };
    },
    [cartItems, context?.conversationId, currentOrder?.items, selectedPaymentMethod?.id],
  );

  const ensureOrder = useCallback(
    async (details: SaleOrderDetails, action: SaleOrderAction) => {
      const orderInput = buildOrderInput(details, action);
      const order = currentOrder
        ? await PointOfSaleService.updateOrder(currentOrder.id, orderInput)
        : await PointOfSaleService.createOrder(orderInput);

      setCurrentOrder(order);
      return order;
    },
    [buildOrderInput, currentOrder],
  );

  const resetCheckout = () => {
    setCartItems([]);
    if (contextCartKey) {
      temporaryCartsByContext.delete(contextCartKey);
    }
    setCurrentOrder(null);
    setSelectedPaymentMethod(null);
    onCheckoutStepChange('cart');
  };

  const handleFinishSale = async () => {
    resetCheckout();
    showToast({ message: 'Venda finalizada.' });
  };

  const handleSaveForLater = async () => {
    if (contextCartKey) {
      temporaryCartsByContext.set(contextCartKey, cartItems);
    }
    setCurrentOrder(null);
    setSelectedPaymentMethod(null);
    onCheckoutStepChange('cart');
    showToast({ message: 'Pedido salvo para depois.' });
  };

  const handleSendSummary = async (message: string) => {
    if (!context?.conversationId) return;

    try {
      await dispatch(
        conversationActions.sendMessage({
          conversationId: context.conversationId,
          message,
          private: false,
          sender: {
            id: userId ?? 0,
            thumbnail: userThumbnail ?? '',
          },
        }),
      ).unwrap();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch {
      Alert.alert('Falha ao enviar', 'Não foi possível enviar o resumo do pedido.');
    }
  };

  if (checkoutStep === 'payment') {
    return (
      <PaymentMethodSelectionView
        methods={defaultPaymentMethods}
        totalCents={cartTotalCents}
        tabBarHeight={bottomOffset}
        showBackHeader={!context}
        onBackPress={() => onCheckoutStepChange('cart')}
        onSelectMethod={handleSelectPaymentMethod}
      />
    );
  }

  if (checkoutStep === 'summary' && selectedPaymentMethod) {
    return (
      <SaleSummaryView
        cartItems={cartItems}
        paymentMethod={selectedPaymentMethod}
        totalCents={cartTotalCents}
        tabBarHeight={bottomOffset}
        context={context}
        showBackHeader={!context}
        onBackPress={() => onCheckoutStepChange('payment')}
        onSendSummary={handleSendSummary}
        onSaveForLater={handleSaveForLater}
        onFinish={handleFinishSale}
        onEnsureOrder={ensureOrder}
      />
    );
  }

  return (
    <View style={tailwind.style('flex-1')}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[tailwind.style('pb-36'), { paddingBottom: bottomOffset + 96 }]}>
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
            style={tailwind.style(
              'h-9 w-9 items-center justify-center rounded-[11px] bg-blackA-A3',
            )}>
            <Icon icon={<BarcodeScanIcon stroke={tailwind.color('text-gray-950')} />} size={21} />
          </Pressable>
        </View>

        {search.trim() ? (
          <SectionTitle title="Resultados" action={catalogName || 'Catálogo XML'} />
        ) : null}
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
        {!isCatalogLoading && !catalogError && search.trim() && visibleProducts.length === 0 ? (
          <Text style={tailwind.style('px-4 py-3 text-sm font-inter-normal-20 text-gray-700')}>
            Nenhum produto encontrado no feed XML.
          </Text>
        ) : null}
        {visibleProducts.map(product => (
          <ProductRow
            key={product.id}
            product={product}
            onPress={() => addProductToCart(product)}
          />
        ))}

        <SectionTitle
          title="Carrinho"
          action={cartItemsCount ? `${cartItemsCount} itens` : undefined}
        />
        {cartItems.length === 0 ? (
          <View
            style={tailwind.style('mx-4 rounded-[8px] border border-blackA-A3 bg-white px-3 py-4')}>
            <Text style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>
              Busque produtos ou serviços acima e toque para adicionar.
            </Text>
          </View>
        ) : null}
        {cartItems.map(item => (
          <CartItemRow
            key={item.product.id}
            item={item}
            onPress={() => openCartItemEditor(item)}
            onIncrement={() => incrementCartItem(item.product.id)}
            onDecrement={() => decrementCartItem(item.product.id)}
            onRemove={() => removeCartItem(item.product.id)}
          />
        ))}

        <View style={tailwind.style('mx-4 mt-4 rounded-[8px] border border-blackA-A3 bg-white')}>
          <View style={tailwind.style('px-4 py-4')}>
            <Text style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>
              Valor manual
              {pendingOperator && calculationBaseCents !== null
                ? ` · ${formatCurrency(calculationBaseCents)} ${pendingOperator}`
                : ''}
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
                    variant={
                      ['+', '-', '×', '÷', '='].includes(key)
                        ? 'operator'
                        : key === 'C' || key === 'Apagar'
                          ? 'danger'
                          : 'default'
                    }
                    onPress={() => handleKeyPress(key)}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          tailwind.style(
            'absolute left-0 right-0 border-t border-blackA-A3 bg-white px-4 pt-3 pb-3',
          ),
          { bottom: bottomOffset },
        ]}>
        <Pressable
          onPress={handleFixedButtonPress}
          style={tailwind.style(
            'h-12 flex-row items-center justify-center rounded-[8px] bg-blue-800',
            isFixedButtonDisabled ? 'opacity-50' : '',
          )}
          disabled={isFixedButtonDisabled}>
          <Icon icon={<AddIcon stroke={tailwind.color('text-white')} />} size={18} />
          <Text style={tailwind.style('ml-2 text-base font-inter-semibold-24 text-white')}>
            {fixedButtonLabel}
          </Text>
        </Pressable>
      </View>
      <BottomSheetModal
        ref={editCartItemSheetRef}
        backdropComponent={BottomSheetBackdrop}
        enablePanDownToClose
        snapPoints={['42%']}
        onDismiss={() => {
          setEditingProductId(null);
          setEditingName('');
          setEditingNotes('');
        }}
        handleIndicatorStyle={tailwind.style('bg-blackA-A6 w-8 h-1 rounded-[11px]')}>
        <BottomSheetHeader headerText="Editar item" />
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={tailwind.style('px-4 pt-5 pb-8')}>
          <Text style={tailwind.style('mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
            Nome
          </Text>
          <BottomSheetTextInput
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Nome do produto"
            placeholderTextColor={tailwind.color('text-gray-500')}
            style={tailwind.style(
              'border-[1px] border-blackA-A3 rounded-lg px-3 py-3 text-base text-gray-950',
            )}
          />
          <Text style={tailwind.style('mt-5 mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
            Observações
          </Text>
          <BottomSheetTextInput
            multiline
            value={editingNotes}
            onChangeText={setEditingNotes}
            placeholder="Ex: tamanho, cor, personalização"
            placeholderTextColor={tailwind.color('text-gray-500')}
            style={tailwind.style(
              'min-h-[96px] border-[1px] border-blackA-A3 rounded-lg px-3 py-3 text-base text-gray-950',
            )}
          />
          <Pressable
            onPress={saveCartItemEditor}
            style={tailwind.style(
              'mt-6 h-12 flex-row items-center justify-center rounded-[8px] bg-blue-800',
            )}>
            <Text style={tailwind.style('text-base font-inter-semibold-24 text-white')}>
              Salvar
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
};

const MetricsView = ({ context }: { context?: PointOfSaleContext }) => {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await PointOfSaleService.getOrders({
        contactId: context?.contactId,
        conversationId: context?.contactId ? undefined : context?.conversationId,
      });
      setOrders(fetchedOrders);
    } catch {
      setOrders([]);
      setError('Não foi possível carregar as métricas.');
    } finally {
      setIsLoading(false);
    }
  }, [context?.contactId, context?.conversationId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const paidOrders = useMemo(
    () => orders.filter(order => order.paymentStatus === 'paid' && order.status !== 'cancelled'),
    [orders],
  );
  const revenueCents = useMemo(
    () => paidOrders.reduce((total, order) => total + order.totalCents, 0),
    [paidOrders],
  );
  const pendingOrdersCount = useMemo(
    () =>
      orders.filter(
        order =>
          order.status !== 'cancelled' && ['unpaid', 'pending'].includes(order.paymentStatus),
      ).length,
    [orders],
  );
  const customerCount = useMemo(() => {
    const customers = new Set(
      orders.map(order => order.contactId || order.customerName).filter(Boolean),
    );
    return customers.size;
  }, [orders]);

  const metricItems = [
    {
      title: 'Faturamento',
      value: formatCurrency(revenueCents),
      caption: context ? 'Histórico do cliente' : 'Pedidos pagos',
    },
    {
      title: 'Ticket médio',
      value: formatCurrency(paidOrders.length ? Math.round(revenueCents / paidOrders.length) : 0),
      caption: `${paidOrders.length} ${paidOrders.length === 1 ? 'venda paga' : 'vendas pagas'}`,
    },
    {
      title: context ? 'Pedidos' : 'Clientes',
      value: context ? String(orders.length) : String(customerCount),
      caption: context ? `${pendingOrdersCount} em aberto` : 'Com pedidos no PDV',
    },
    {
      title: 'Pendentes',
      value: String(pendingOrdersCount),
      caption: 'Aguardando pagamento',
    },
  ];

  return (
    <ScrollView contentContainerStyle={tailwind.style('pb-28')}>
      <SectionTitle title={context ? 'Resumo do cliente' : 'Resumo'} action="Real" />
      {isLoading ? (
        <Text style={tailwind.style('px-4 py-3 text-sm font-inter-normal-20 text-gray-700')}>
          Carregando métricas...
        </Text>
      ) : null}
      {!isLoading && error ? (
        <View
          style={tailwind.style(
            'mx-4 mb-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-3',
          )}>
          <Text style={tailwind.style('text-sm font-inter-medium-24 text-amber-900')}>{error}</Text>
          <Pressable onPress={loadOrders} hitSlop={8}>
            <Text style={tailwind.style('pt-2 text-sm font-inter-semibold-24 text-blue-800')}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={tailwind.style('flex-row flex-wrap px-3')}>
        {metricItems.map(item => (
          <View key={item.title} style={tailwind.style('w-1/2 px-1 pb-2')}>
            <View
              style={tailwind.style(
                'min-h-[112px] justify-between rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
              )}>
              <Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-700')}>
                {item.title}
              </Text>
              <View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={tailwind.style('text-[26px] font-inter-semibold-24 text-gray-950')}>
                  {item.value}
                </Text>
                <Text style={tailwind.style('pt-1 text-xs font-inter-normal-20 text-gray-700')}>
                  {item.caption}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <SectionTitle title={context ? 'Últimos movimentos' : 'Últimos indicadores'} />
      {[
        ['Vendas pagas', `${paidOrders.length} pedidos confirmados`],
        ['Pedidos pendentes', `${pendingOrdersCount} aguardando pagamento`],
        [
          context ? 'Carrinho temporário' : 'Total de pedidos',
          context
            ? temporaryCartsByContext.has(`conversation:${context.conversationId}`)
              ? 'Mantido para esta conversa'
              : 'Nenhum carrinho salvo'
            : `${orders.length} registrados`,
        ],
      ].map(([title, description]) => (
        <View
          key={title}
          style={tailwind.style(
            'mx-4 mb-2 rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
          )}>
          <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
            {title}
          </Text>
          <Text style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-gray-700')}>
            {description}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const OrdersView = ({ context }: { context?: PointOfSaleContext }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus>('Todos');
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await PointOfSaleService.getOrders({
        contactId: context?.contactId,
        conversationId: context?.contactId ? undefined : context?.conversationId,
      });
      setOrders(fetchedOrders);
    } catch {
      setOrders([]);
      setError('Não foi possível carregar os pedidos.');
    } finally {
      setIsLoading(false);
    }
  }, [context?.contactId, context?.conversationId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = statusFilterMatches(order, status);
      const matchesSearch = `#${order.id} ${order.customerName} ${paymentMethodLabel(
        order.paymentMethod,
      )} ${paymentStatusLabel(order.paymentStatus)}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, status]);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={tailwind.style('pb-28')}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        placeholder={context ? 'Buscar pedidos do cliente' : 'Buscar pedidos'}
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
      {isLoading ? (
        <Text style={tailwind.style('px-4 py-3 text-sm font-inter-normal-20 text-gray-700')}>
          Carregando pedidos...
        </Text>
      ) : null}
      {!isLoading && error ? (
        <View
          style={tailwind.style(
            'mx-4 mb-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-3',
          )}>
          <Text style={tailwind.style('text-sm font-inter-medium-24 text-amber-900')}>{error}</Text>
          <Pressable onPress={loadOrders} hitSlop={8}>
            <Text style={tailwind.style('pt-2 text-sm font-inter-semibold-24 text-blue-800')}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : null}
      {!isLoading && !error && filteredOrders.length === 0 ? (
        <View
          style={tailwind.style('mx-4 rounded-[8px] border border-blackA-A3 bg-white px-3 py-4')}>
          <Text style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>
            Nenhum pedido encontrado.
          </Text>
        </View>
      ) : null}
      {filteredOrders.map(order => (
        <View
          key={order.id}
          style={tailwind.style(
            'mx-4 mb-2 rounded-[8px] border border-blackA-A3 bg-white px-3 py-3',
          )}>
          <View style={tailwind.style('flex-row items-center justify-between')}>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
              #{order.id}
            </Text>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
              {formatCurrency(order.totalCents)}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={tailwind.style('pt-1 text-sm font-inter-medium-24 text-gray-950')}>
            {order.customerName}
          </Text>
          <View style={tailwind.style('mt-2 flex-row items-center justify-between')}>
            <Text style={tailwind.style('text-xs font-inter-normal-20 text-gray-700')}>
              {paymentMethodLabel(order.paymentMethod)}
            </Text>
            <Text
              style={tailwind.style(
                'text-xs font-inter-semibold-24',
                order.paymentStatus === 'paid'
                  ? 'text-green-700'
                  : order.status === 'cancelled'
                    ? 'text-red-700'
                    : 'text-amber-800',
              )}>
              {order.status === 'cancelled' ? 'Cancelado' : paymentStatusLabel(order.paymentStatus)}
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
    { id: 'payment_link', title: 'Link de pagamento', enabled: true },
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
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ PointOfSale: PointOfSaleRouteParams | undefined }, 'PointOfSale'>>();
  const pagerRef = useRef<ScrollView>(null);
  const didSetInitialPageRef = useRef(false);
  const { width } = useWindowDimensions();
  const [view, setView] = useState<PointOfSaleView>('checkout');
  const [previousView, setPreviousView] = useState<PointOfSaleView>('checkout');
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const context = useMemo<PointOfSaleContext | undefined>(() => {
    const params = route.params;
    if (!params?.conversationId && !params?.contactId) return undefined;

    return {
      conversationId: params.conversationId,
      contactId: params.contactId,
      contactName: params.contactName || 'Consumidor final',
      contactThumbnail: params.contactThumbnail,
    };
  }, [route.params]);

  const scrollToView = useCallback(
    (nextView: PointOfSaleView, animated: boolean) => {
      if (nextView === 'settings') return;
      const pageIndex = ['metrics', 'checkout', 'orders'].indexOf(nextView);
      pagerRef.current?.scrollTo({
        x: pageIndex * width,
        animated,
      });
    },
    [width],
  );

  useEffect(() => {
    if (didSetInitialPageRef.current) return;
    didSetInitialPageRef.current = true;
    scrollToView(view, false);
  }, [scrollToView, view]);

  const handleViewChange = (nextView: PointOfSaleView) => {
    setView(nextView);
    scrollToView(nextView, true);
  };

  const handleSettingsPress = () => {
    setPreviousView(view);
    setView('settings');
  };

  const handleBackPress = () => {
    if (view !== 'settings' && context) {
      if (view === 'checkout' && checkoutStep === 'summary') {
        setCheckoutStep('payment');
        return;
      }
      if (view === 'checkout' && checkoutStep === 'payment') {
        setCheckoutStep('cart');
        return;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return;
    }
    handleViewChange(previousView);
  };

  const handlePagerMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setView((['metrics', 'checkout', 'orders'][pageIndex] || 'checkout') as PointOfSaleView);
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <PointOfSaleHeader
        view={view}
        onViewChange={handleViewChange}
        onSettingsPress={handleSettingsPress}
        onBackPress={handleBackPress}
        context={context}
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
          <View key="metrics" style={[tailwind.style('flex-1'), { width }]}>
            <MetricsView context={context} />
          </View>
          <View key="checkout" style={[tailwind.style('flex-1'), { width }]}>
            <CheckoutView
              context={context}
              checkoutStep={checkoutStep}
              onCheckoutStepChange={setCheckoutStep}
            />
          </View>
          <View key="orders" style={[tailwind.style('flex-1'), { width }]}>
            <OrdersView context={context} />
          </View>
        </ScrollView>
      ) : null}
      {view === 'settings' ? <SettingsView /> : null}
    </SafeAreaView>
  );
};
