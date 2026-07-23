import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Button, Icon } from '@/components-next';
import { TAB_BAR_HEIGHT } from '@/constants';
import { CatalogService } from '@/store/catalog/catalogService';
import type { CatalogItem, CatalogItemType } from '@/types/CatalogItem';
import { AddIcon, ChevronLeft, Trash } from '@/svg-icons';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';

const durationOptions = [30, 45, 60, 90, 120];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const parseMoney = (value: string) => {
  const numeric = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return Math.round(Number(numeric || 0) * 100);
};

const Header = ({ onAdd }: { onAdd: () => void }) => {
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
            'flex-[2] text-center text-[17px] font-inter-medium-24 text-gray-950',
          )}>
          Catálogo
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1 items-end')}>
          <Pressable
            onPress={onAdd}
            style={tailwind.style('h-9 w-9 items-center justify-center rounded-full bg-blue-800')}>
            <Icon icon={<AddIcon stroke="white" />} size={20} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const Option = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'rounded-full border px-3 py-2',
      selected ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3 bg-white',
    )}>
    <Animated.Text style={tailwind.style('text-sm', selected ? 'text-blue-800' : 'text-gray-700')}>
      {label}
    </Animated.Text>
  </Pressable>
);

const CatalogForm = ({
  item,
  onCancel,
  onSaved,
}: {
  item?: CatalogItem | null;
  onCancel: () => void;
  onSaved: () => void;
}) => {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [itemType, setItemType] = useState<CatalogItemType>(item?.itemType || 'service');
  const [price, setPrice] = useState(item ? String(item.priceCents / 100).replace('.', ',') : '');
  const [durationMinutes, setDurationMinutes] = useState(item?.durationMinutes || 60);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        itemType,
        priceCents: parseMoney(price),
        durationMinutes: itemType === 'service' ? durationMinutes : undefined,
      };
      if (item?.id) {
        await CatalogService.update(item.id, payload);
      } else {
        await CatalogService.create(payload);
      }
      showToast({ message: item?.id ? 'Item atualizado' : 'Item criado' });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Animated.View style={tailwind.style('mx-4 mt-4 rounded-[8px] border border-blackA-A3 p-3')}>
      <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
        {item?.id ? 'Editar item' : 'Novo item'}
      </Animated.Text>
      <Animated.View style={tailwind.style('mt-4 flex-row gap-2')}>
        <Option
          label="Serviço"
          selected={itemType === 'service'}
          onPress={() => setItemType('service')}
        />
        <Option
          label="Produto"
          selected={itemType === 'product'}
          onPress={() => setItemType('product')}
        />
      </Animated.View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nome"
        placeholderTextColor={tailwind.color('text-gray-500')}
        style={tailwind.style(
          'mt-4 rounded-[8px] border border-blackA-A3 px-3 py-3 text-base text-gray-950',
        )}
      />
      <TextInput
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder="Descrição"
        placeholderTextColor={tailwind.color('text-gray-500')}
        style={tailwind.style(
          'mt-3 min-h-[74px] rounded-[8px] border border-blackA-A3 px-3 py-3 text-base text-gray-950',
        )}
      />
      <TextInput
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="Valor"
        placeholderTextColor={tailwind.color('text-gray-500')}
        style={tailwind.style(
          'mt-3 rounded-[8px] border border-blackA-A3 px-3 py-3 text-base text-gray-950',
        )}
      />
      {itemType === 'service' ? (
        <>
          <Animated.Text
            style={tailwind.style('mt-4 mb-2 text-sm font-inter-medium-24 text-gray-800')}>
            Duração
          </Animated.Text>
          <Animated.View style={tailwind.style('flex-row flex-wrap gap-2')}>
            {durationOptions.map(duration => (
              <Option
                key={duration}
                label={`${duration} min`}
                selected={durationMinutes === duration}
                onPress={() => setDurationMinutes(duration)}
              />
            ))}
          </Animated.View>
        </>
      ) : null}
      <Animated.View style={tailwind.style('mt-5 flex-row gap-3')}>
        <Animated.View style={tailwind.style('flex-1')}>
          <Button text="Cancelar" variant="secondary" handlePress={onCancel} />
        </Animated.View>
        <Animated.View style={tailwind.style('flex-1')}>
          <Button
            text={saving ? 'Salvando...' : 'Salvar'}
            handlePress={handleSave}
            disabled={!name.trim() || saving}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const CatalogRow = ({
  item,
  onPress,
  onRemove,
}: {
  item: CatalogItem;
  onPress: () => void;
  onRemove: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style('mx-4 flex-row items-center border-b border-blackA-A3 py-4')}>
    <Animated.View style={tailwind.style('flex-1')}>
      <Animated.Text
        numberOfLines={1}
        style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
        {item.name}
      </Animated.Text>
      <Animated.Text style={tailwind.style('pt-1 text-sm text-gray-700')}>
        {item.itemType === 'service' ? `Serviço · ${item.durationMinutes || 0} min` : 'Produto'} ·{' '}
        {formatCurrency(item.priceCents)}
      </Animated.Text>
    </Animated.View>
    <Pressable
      onPress={onRemove}
      hitSlop={12}
      style={tailwind.style('h-9 w-9 items-center justify-center rounded-[8px] bg-red-50')}>
      <Icon icon={<Trash />} size={18} />
    </Pressable>
  </Pressable>
);

const CatalogItemsScreen = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<CatalogItem | null | undefined>();

  const load = async () => {
    const data = await CatalogService.list();
    setItems(data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRemove = async (item: CatalogItem) => {
    await CatalogService.remove(item.id);
    showToast({ message: 'Item removido' });
    load();
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header onAdd={() => setEditingItem(null)} />
      {loading ? (
        <ActivityIndicator style={tailwind.style('mt-12')} />
      ) : (
        <ScrollView contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
          {editingItem !== undefined ? (
            <CatalogForm
              item={editingItem}
              onCancel={() => setEditingItem(undefined)}
              onSaved={() => {
                setEditingItem(undefined);
                load();
              }}
            />
          ) : null}
          {items.map(item => (
            <CatalogRow
              key={item.id}
              item={item}
              onPress={() => setEditingItem(item)}
              onRemove={() => handleRemove(item)}
            />
          ))}
          {items.length === 0 && editingItem === undefined ? (
            <Animated.Text style={tailwind.style('px-8 pt-14 text-center text-sm text-gray-700')}>
              Cadastre produtos e serviços para usar no PDV e nos agendamentos.
            </Animated.Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default CatalogItemsScreen;
