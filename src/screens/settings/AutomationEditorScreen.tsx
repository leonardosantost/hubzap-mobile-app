import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon } from '@/components-next';
import { TAB_BAR_HEIGHT } from '@/constants';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';
import {
  AutomationAction,
  AutomationCondition,
  AutomationPayload,
  AutomationRule,
  AutomationService,
} from '@/store/automation/automationService';
import { ChevronLeft, Trash } from '@/svg-icons';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';

import { automationTemplates } from './automationTemplates';

type Route = RouteProp<SettingsStackParamList, 'AutomationEditorScreen'>;
type EditingNode =
  | { type: 'trigger' }
  | { type: 'condition'; index: number }
  | { type: 'action'; index: number };

const eventOptions = [
  { label: 'Conversa criada', value: 'conversation_created' },
  { label: 'Conversa atualizada', value: 'conversation_updated' },
  { label: 'Mensagem criada', value: 'message_created' },
  { label: 'Conversa aberta', value: 'conversation_opened' },
  { label: 'Conversa resolvida', value: 'conversation_resolved' },
];

const conditionAttributeOptions = [
  { label: 'Etiqueta', value: 'labels' },
  { label: 'Status', value: 'status' },
  { label: 'Prioridade', value: 'priority' },
  { label: 'Agente', value: 'assignee_id' },
  { label: 'Time', value: 'team_id' },
  { label: 'Inbox', value: 'inbox_id' },
];

const conditionOperatorOptions = [
  { label: 'Igual a', value: 'equal_to' },
  { label: 'Diferente de', value: 'not_equal_to' },
  { label: 'Contém', value: 'contains' },
  { label: 'Não contém', value: 'does_not_contain' },
];

const actionOptions = [
  { label: 'Enviar mensagem', value: 'send_message' },
  { label: 'Adicionar nota interna', value: 'add_private_note' },
  { label: 'Adicionar etiqueta', value: 'add_label' },
  { label: 'Remover etiqueta', value: 'remove_label' },
  { label: 'Alterar status', value: 'change_status' },
  { label: 'Alterar prioridade', value: 'change_priority' },
  { label: 'Atribuir time', value: 'assign_team' },
  { label: 'Atribuir agente', value: 'assign_agent' },
  { label: 'Adiar conversa', value: 'snooze_conversation' },
  { label: 'Silenciar conversa', value: 'mute_conversation' },
  { label: 'Chamar webhook', value: 'webhook' },
];

const CANVAS_WIDTH = 920;
const CANVAS_HEIGHT = 620;
const NODE_PORT_Y = 34;
const FLOW_NODE_LEFT_PORT = 24;
const FLOW_NODE_RIGHT_PORT = 92;
const ACTION_NODE_LEFT_PORT = 40;
const INITIAL_SCALE = 0.92;
const INITIAL_TRANSLATE_X = -28;
const INITIAL_TRANSLATE_Y = 16;

const draftAutomation: AutomationPayload & { accent: string } = {
  name: 'Nova automação',
  description: 'Configure o gatilho, as condições e as ações desta automação.',
  event_name: 'conversation_created',
  active: true,
  conditions: [],
  actions: [
    {
      action_name: 'add_private_note',
      action_params: ['Nova automação criada pelo app mobile.'],
    },
  ],
  accent: '#0EA5A3',
};

const CanvasBackground = () => (
  <Svg width="100%" height="100%" style={tailwind.style('absolute inset-0')}>
    <Defs>
      <Pattern id="automationDots" width="20" height="20" patternUnits="userSpaceOnUse">
        <Circle cx="2" cy="2" r="1" fill="#DDE6F3" />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="#FBFCFE" />
    <Rect width="100%" height="100%" fill="url(#automationDots)" />
  </Svg>
);

const FlowIcon = ({ type }: { type: 'when' | 'if' | 'do' | 'wait' }) => {
  if (type === 'if') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 6H19L14 12V18L10 20V12L5 6Z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === 'wait') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.8" />
        <Path d="M12 7V12L15 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'do') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 18V7C5 5.9 5.9 5 7 5H17C18.1 5 19 5.9 19 7V14C19 15.1 18.1 16 17 16H9L5 18Z"
          stroke="white"
          strokeWidth="1.8"
        />
      </Svg>
    );
  }

  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="6" width="14" height="13" rx="2" stroke="white" strokeWidth="1.8" />
      <Path d="M8 4V8M16 4V8M5 10H19" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
};

const Header = ({
  title,
  active,
  onToggle,
}: {
  title: string;
  active: boolean;
  onToggle: (active: boolean) => void;
}) => {
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
          numberOfLines={1}
          ellipsizeMode="tail"
          style={tailwind.style(
            'mx-2 flex-[2] text-center text-[16px] font-inter-medium-24 text-gray-950',
          )}>
          {title}
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1 items-end')}>
          <Switch value={active} onValueChange={onToggle} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const conditionTitle = (condition?: AutomationCondition) => {
  if (!condition) return 'Sem condição';
  if (condition.attribute_key === 'labels')
    return `Etiqueta ${Array.isArray(condition.values) ? condition.values.join(', ') : condition.values}`;
  if (condition.attribute_key === 'status')
    return `Status ${Array.isArray(condition.values) ? condition.values.join(', ') : condition.values}`;
  return condition.attribute_key;
};

const eventTitle = (eventName: string) => {
  if (eventName === 'message_created') return 'Mensagem criada';
  if (eventName === 'conversation_updated') return 'Conversa atualizada';
  if (eventName === 'conversation_resolved') return 'Conversa resolvida';
  if (eventName === 'conversation_opened') return 'Conversa aberta';
  if (eventName === 'conversation_created') return 'Conversa criada';
  return 'Evento configurado';
};

const actionTitle = (action: AutomationAction) => {
  const rawValue = Array.isArray(action.action_params) ? action.action_params[0] : '';
  const value = typeof rawValue === 'string' ? rawValue : '';
  if (action.action_name === 'send_message') return 'Enviar mensagem';
  if (action.action_name === 'add_private_note') return 'Adicionar nota interna';
  if (action.action_name === 'add_label') return `Adicionar etiqueta ${value || ''}`;
  if (action.action_name === 'change_status') return `Alterar status ${value || ''}`;
  if (action.action_name === 'assign_team') return 'Atribuir time';
  if (action.action_name === 'assign_agent') return 'Atribuir agente';
  if (action.action_name === 'change_priority') return 'Alterar prioridade';
  if (action.action_name === 'mute_conversation') return 'Silenciar conversa';
  if (action.action_name === 'snooze_conversation') return 'Adiar conversa';
  if (action.action_name === 'send_email_to_team') return 'Enviar e-mail ao time';
  if (action.action_name === 'send_attachment') return 'Enviar anexo';
  if (action.action_name === 'add_contact_label') return `Etiqueta no contato ${value || ''}`;
  if (action.action_name === 'remove_label') return `Remover etiqueta ${value || ''}`;
  if (action.action_name === 'remove_contact_label')
    return `Remover etiqueta do contato ${value || ''}`;
  if (action.action_name === 'webhook') return 'Chamar webhook';
  if (action.action_name === 'content') return 'Conteúdo da mensagem';
  return action.action_name;
};

const actionDetail = (action: AutomationAction) => {
  const value = Array.isArray(action.action_params) ? action.action_params[0] : undefined;

  if (!value) return undefined;

  if (typeof value === 'string') {
    if (['content', 'team_id', 'assignee_id', 'priority', 'status', 'labels'].includes(value)) {
      return undefined;
    }

    return value;
  }

  if (typeof value === 'object') {
    const content = value.content;
    if (typeof content === 'string' && content.length > 0) return content;

    if ('priority' in value) return 'Prioridade configurada';
    if ('status' in value) return 'Status configurado';
    if ('team_id' in value) return 'Time selecionado';
    if ('assignee_id' in value) return 'Agente selecionado';
    if ('labels' in value) return 'Etiquetas configuradas';
  }

  return undefined;
};

const FlowNode = ({
  label,
  title,
  detail,
  type,
  color,
  variant = 'square',
  onPress,
}: {
  label: string;
  title: string;
  detail?: string;
  type: 'when' | 'if' | 'do' | 'wait';
  color: string;
  variant?: 'square' | 'wide';
  onPress: () => void;
}) => (
  <Animated.View
    style={tailwind.style(
      'h-[132px] items-center',
      variant === 'wide' ? 'w-[148px]' : 'w-[116px]',
    )}>
    <Pressable
      onPress={onPress}
      style={[
        tailwind.style(
          'relative h-[68px] w-[68px] items-center justify-center rounded-[8px] border border-gray-300 bg-white shadow-sm',
        ),
        { borderTopColor: color, borderTopWidth: 2 },
      ]}>
      <Animated.View
        style={tailwind.style(
          'absolute left-[-7px] top-[27px] h-[14px] w-[14px] rounded-full border border-gray-400 bg-white',
        )}
      />
      <Animated.View
        style={tailwind.style(
          'absolute right-[-7px] top-[27px] h-[14px] w-[14px] rounded-full border border-gray-400 bg-white',
        )}
      />
      <Animated.View
        style={[
          tailwind.style('h-[42px] w-[42px] items-center justify-center rounded-[8px]'),
          { backgroundColor: color },
        ]}>
        <FlowIcon type={type} />
      </Animated.View>
    </Pressable>
    <Pressable onPress={onPress} style={tailwind.style('mt-2 items-center px-1')}>
      <Animated.Text
        numberOfLines={1}
        style={[
          tailwind.style('text-[11px] font-inter-semibold-24 uppercase leading-[13px]'),
          { color },
        ]}>
        {label}
      </Animated.Text>
      <Animated.Text
        numberOfLines={2}
        style={tailwind.style(
          'pt-0.5 text-center text-[14px] font-inter-semibold-24 leading-[17px] text-gray-950',
        )}>
        {title}
      </Animated.Text>
      {detail ? (
        <Animated.Text
          numberOfLines={1}
          style={tailwind.style(
            'pt-0.5 text-center text-[11px] font-inter-normal-20 leading-[14px] text-gray-700',
          )}>
          {detail}
        </Animated.Text>
      ) : null}
    </Pressable>
  </Animated.View>
);

const arrowPath = (x: number, y: number) => `M${x} ${y}L${x - 8} ${y - 5}V${y + 5}L${x} ${y}Z`;

const curvedPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const controlOffset = Math.max(44, Math.abs(to.x - from.x) * 0.48);
  return `M${from.x} ${from.y} C${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
};

const WorkflowConnectors = ({
  trigger,
  condition,
  actionNodes,
}: {
  trigger: { x: number; y: number };
  condition: { x: number; y: number };
  actionNodes: { x: number; y: number }[];
}) => {
  const triggerOut = {
    x: trigger.x + FLOW_NODE_RIGHT_PORT,
    y: trigger.y + NODE_PORT_Y,
  };
  const conditionIn = {
    x: condition.x + FLOW_NODE_LEFT_PORT,
    y: condition.y + NODE_PORT_Y,
  };
  const conditionOut = {
    x: condition.x + FLOW_NODE_RIGHT_PORT,
    y: condition.y + NODE_PORT_Y,
  };
  const branchX = conditionOut.x + 64;

  return (
    <Svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      style={tailwind.style('absolute inset-0')}>
      <Path d={curvedPath(triggerOut, conditionIn)} stroke="#8B929E" strokeWidth="2" fill="none" />
      <Path d={arrowPath(conditionIn.x, conditionIn.y)} fill="#8B929E" />

      {actionNodes.length > 0 ? (
        <>
          {actionNodes.map((node, index) => {
            const actionIn = {
              x: node.x + ACTION_NODE_LEFT_PORT,
              y: node.y + NODE_PORT_Y,
            };
            const branchPoint = { x: branchX, y: actionIn.y };

            return (
              <React.Fragment key={`connector-${index}`}>
                <Path
                  d={curvedPath(conditionOut, branchPoint)}
                  stroke="#8B929E"
                  strokeWidth="2"
                  fill="none"
                />
                <Path
                  d={curvedPath(branchPoint, actionIn)}
                  stroke="#8B929E"
                  strokeWidth="2"
                  fill="none"
                />
                <Path d={arrowPath(actionIn.x, actionIn.y)} fill="#8B929E" />
              </React.Fragment>
            );
          })}
        </>
      ) : null}
    </Svg>
  );
};

const AddStepButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'h-8 w-8 items-center justify-center rounded-[8px] border border-gray-300 bg-white',
    )}>
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 4V14M4 9H14" stroke="#111827" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  </Pressable>
);

const CanvasControls = ({ onReset }: { onReset: () => void }) => (
  <Animated.View
    style={tailwind.style('absolute left-4 flex-row gap-2', `bottom-[${TAB_BAR_HEIGHT + 74}px]`)}>
    <Pressable
      onPress={onReset}
      style={tailwind.style(
        'h-10 w-10 items-center justify-center rounded-[8px] border border-blackA-A3 bg-white shadow-sm',
      )}>
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path
          d="M7 3H4C3.45 3 3 3.45 3 4V7M13 3H16C16.55 3 17 3.45 17 4V7M17 13V16C17 16.55 16.55 17 16 17H13M7 17H4C3.45 17 3 16.55 3 16V13"
          stroke="#374151"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  </Animated.View>
);

const CanvasToolbar = () => (
  <Animated.View
    style={tailwind.style(
      'absolute left-0 right-0 top-0 z-10 items-center border-b-[1px] border-b-blackA-A3 bg-white/95 py-2',
    )}>
    <Animated.View style={tailwind.style('flex-row rounded-[8px] bg-gray-100 p-1')}>
      <Animated.View style={tailwind.style('rounded-[7px] bg-white px-4 py-1.5 shadow-sm')}>
        <Animated.Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-950')}>
          Editor
        </Animated.Text>
      </Animated.View>
      <Animated.View style={tailwind.style('px-4 py-1.5')}>
        <Animated.Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-600')}>
          Salvo
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  </Animated.View>
);

const FieldLabel = ({ children }: { children: string }) => (
  <Animated.Text style={tailwind.style('mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
    {children}
  </Animated.Text>
);

const TextField = ({
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={tailwind.color('text-gray-500')}
    multiline={multiline}
    style={tailwind.style(
      multiline
        ? 'min-h-[88px] rounded-[8px] border border-blackA-A3 px-3 py-3 text-base text-gray-950'
        : 'rounded-[8px] border border-blackA-A3 px-3 py-3 text-base text-gray-950',
    )}
  />
);

const OptionGroup = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <Animated.View style={tailwind.style('flex-row flex-wrap gap-2')}>
    {options.map(option => {
      const selected = option.value === value;

      return (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={tailwind.style(
            'rounded-full border px-3 py-2',
            selected ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3 bg-white',
          )}>
          <Animated.Text
            style={tailwind.style(
              'text-sm font-inter-medium-24',
              selected ? 'text-blue-800' : 'text-gray-700',
            )}>
            {option.label}
          </Animated.Text>
        </Pressable>
      );
    })}
  </Animated.View>
);

const paramsToText = (params: AutomationAction['action_params']) => {
  const value = Array.isArray(params) ? params[0] : '';
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.content === 'string') return value.content;
  if (typeof value.url === 'string') return value.url;
  if (typeof value.priority === 'string') return value.priority;
  if (typeof value.status === 'string') return value.status;
  if (typeof value.team_id === 'number') return String(value.team_id);
  if (typeof value.assignee_id === 'number') return String(value.assignee_id);
  if (Array.isArray(value.labels)) return value.labels.join(', ');
  return '';
};

const textToParams = (actionName: string, text: string): AutomationAction['action_params'] => {
  const value = text.trim();

  if (['send_message', 'add_private_note', 'content'].includes(actionName)) {
    return [value];
  }

  if (
    ['add_label', 'remove_label', 'add_contact_label', 'remove_contact_label'].includes(actionName)
  ) {
    return [value];
  }

  if (actionName === 'change_priority') return [value || 'medium'];
  if (actionName === 'change_status') return [value || 'open'];
  if (actionName === 'assign_team') return [value];
  if (actionName === 'assign_agent') return [value];
  if (actionName === 'webhook') return [value];

  return value ? [value] : [];
};

const valuesToText = (values: AutomationCondition['values']) =>
  Array.isArray(values) ? values.join(', ') : values;

const textToValues = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const StepEditorModal = ({
  editingNode,
  name,
  description,
  eventName,
  conditions,
  actions,
  onClose,
  onChangeName,
  onChangeDescription,
  onChangeEvent,
  onChangeCondition,
  onRemoveCondition,
  onChangeAction,
  onRemoveAction,
}: {
  editingNode: EditingNode | null;
  name: string;
  description: string;
  eventName: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeEvent: (value: string) => void;
  onChangeCondition: (index: number, condition: AutomationCondition) => void;
  onRemoveCondition: (index: number) => void;
  onChangeAction: (index: number, action: AutomationAction) => void;
  onRemoveAction: (index: number) => void;
}) => {
  const condition =
    editingNode?.type === 'condition'
      ? conditions[editingNode.index] || {
          attribute_key: 'labels',
          filter_operator: 'contains',
          values: [],
          query_operator: '',
          custom_attribute_type: '',
        }
      : undefined;
  const action =
    editingNode?.type === 'action'
      ? actions[editingNode.index] || { action_name: 'send_message', action_params: [''] }
      : undefined;

  const updateCondition = (patch: Partial<AutomationCondition>) => {
    if (editingNode?.type !== 'condition' || !condition) return;
    onChangeCondition(editingNode.index, { ...condition, ...patch });
  };

  const updateAction = (patch: Partial<AutomationAction>) => {
    if (editingNode?.type !== 'action' || !action) return;
    onChangeAction(editingNode.index, { ...action, ...patch });
  };

  return (
    <Modal
      visible={Boolean(editingNode)}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <Animated.View style={tailwind.style('flex-1 justify-end bg-black/30')}>
        <Animated.View
          style={tailwind.style('max-h-[82%] rounded-t-[18px] bg-white pt-3 shadow-lg')}>
          <Animated.View style={tailwind.style('items-center pb-2')}>
            <Animated.View style={tailwind.style('h-1 w-9 rounded-full bg-gray-300')} />
          </Animated.View>
          <Animated.View
            style={tailwind.style(
              'flex-row items-center justify-between border-b border-blackA-A3 px-4 pb-3',
            )}>
            <Animated.Text style={tailwind.style('text-lg font-inter-semibold-24 text-gray-950')}>
              {editingNode?.type === 'trigger'
                ? 'Editar gatilho'
                : editingNode?.type === 'condition'
                  ? 'Editar condição'
                  : 'Editar ação'}
            </Animated.Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-blue-800')}>
                OK
              </Animated.Text>
            </Pressable>
          </Animated.View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tailwind.style('px-4 pt-5 pb-8')}>
            {editingNode?.type === 'trigger' ? (
              <>
                <FieldLabel>Nome da automação</FieldLabel>
                <TextField
                  value={name}
                  onChangeText={onChangeName}
                  placeholder="Nome da automação"
                />
                <Animated.View style={tailwind.style('h-5')} />
                <FieldLabel>Descrição</FieldLabel>
                <TextField
                  multiline
                  value={description}
                  onChangeText={onChangeDescription}
                  placeholder="Descreva o objetivo desta automação"
                />
                <Animated.View style={tailwind.style('h-5')} />
                <FieldLabel>Quando acontece</FieldLabel>
                <OptionGroup options={eventOptions} value={eventName} onChange={onChangeEvent} />
              </>
            ) : null}

            {editingNode?.type === 'condition' && condition ? (
              <>
                <FieldLabel>Campo</FieldLabel>
                <OptionGroup
                  options={conditionAttributeOptions}
                  value={condition.attribute_key}
                  onChange={value => updateCondition({ attribute_key: value })}
                />
                <Animated.View style={tailwind.style('h-5')} />
                <FieldLabel>Operador</FieldLabel>
                <OptionGroup
                  options={conditionOperatorOptions}
                  value={condition.filter_operator}
                  onChange={value => updateCondition({ filter_operator: value })}
                />
                <Animated.View style={tailwind.style('h-5')} />
                <FieldLabel>Valores</FieldLabel>
                <TextField
                  value={valuesToText(condition.values)}
                  onChangeText={value => updateCondition({ values: textToValues(value) })}
                  placeholder="Ex: follow-up, urgente"
                />
                <Pressable
                  onPress={() => {
                    if (editingNode.type === 'condition') {
                      onRemoveCondition(editingNode.index);
                      onClose();
                    }
                  }}
                  style={tailwind.style('mt-6 rounded-[8px] bg-red-50 px-4 py-3')}>
                  <Animated.Text
                    style={tailwind.style(
                      'text-center text-base font-inter-medium-24 text-ruby-800',
                    )}>
                    Remover condição
                  </Animated.Text>
                </Pressable>
              </>
            ) : null}

            {editingNode?.type === 'action' && action ? (
              <>
                <FieldLabel>Tipo de ação</FieldLabel>
                <OptionGroup
                  options={actionOptions}
                  value={action.action_name}
                  onChange={value =>
                    updateAction({
                      action_name: value,
                      action_params: textToParams(value, paramsToText(action.action_params)),
                    })
                  }
                />
                <Animated.View style={tailwind.style('h-5')} />
                <FieldLabel>Conteúdo ou valor</FieldLabel>
                <TextField
                  multiline={['send_message', 'add_private_note'].includes(action.action_name)}
                  value={paramsToText(action.action_params)}
                  onChangeText={value =>
                    updateAction({ action_params: textToParams(action.action_name, value) })
                  }
                  placeholder="Mensagem, etiqueta, status, prioridade, ID ou webhook"
                />
                <Pressable
                  onPress={() => {
                    if (editingNode.type === 'action') {
                      onRemoveAction(editingNode.index);
                      onClose();
                    }
                  }}
                  style={tailwind.style('mt-6 rounded-[8px] bg-red-50 px-4 py-3')}>
                  <Animated.Text
                    style={tailwind.style(
                      'text-center text-base font-inter-medium-24 text-ruby-800',
                    )}>
                    Remover ação
                  </Animated.Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const AutomationEditorScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const template = useMemo(
    () => automationTemplates.find(item => item.key === route.params?.templateKey),
    [route.params?.templateKey],
  );
  const [rule, setRule] = useState<AutomationRule | null>(null);
  const [loading, setLoading] = useState(Boolean(route.params?.automationId));
  const [saving, setSaving] = useState(false);
  const draft = template || draftAutomation;
  const [name, setName] = useState(draft.name);
  const [description, setDescription] = useState(draft.description || '');
  const [eventName, setEventName] = useState(draft.event_name);
  const [conditions, setConditions] = useState<AutomationCondition[]>(draft.conditions);
  const [actions, setActions] = useState<AutomationAction[]>(draft.actions);
  const [active, setActive] = useState(draft.active);
  const [editingNode, setEditingNode] = useState<EditingNode | null>(null);
  const accent = draft.accent;
  const scale = useSharedValue(INITIAL_SCALE);
  const translateX = useSharedValue(INITIAL_TRANSLATE_X);
  const translateY = useSharedValue(INITIAL_TRANSLATE_Y);
  const panStartX = useSharedValue(INITIAL_TRANSLATE_X);
  const panStartY = useSharedValue(INITIAL_TRANSLATE_Y);
  const pinchStartScale = useSharedValue(INITIAL_SCALE);

  const nodePositions = useMemo(() => {
    const actionCount = Math.max(actions.length, 1);
    const actionSpacing = 148;
    const actionStartY = Math.max(58, 244 - ((actionCount - 1) * actionSpacing) / 2);
    const actionNodes = actions.map((_, index) => ({
      x: 610,
      y: actionStartY + index * actionSpacing,
    }));

    return {
      trigger: { x: 70, y: 244 },
      condition: { x: 310, y: 244 },
      actionNodes,
      addButton: {
        x: actions.length > 0 ? 782 : 470,
        y:
          actions.length > 0
            ? (actionNodes[0].y + actionNodes[actionNodes.length - 1].y) / 2 + NODE_PORT_Y - 16
            : 260,
      },
    };
  }, [actions]);

  const panGesture = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
    })
    .onUpdate(event => {
      translateX.value = panStartX.value + event.translationX;
      translateY.value = panStartY.value + event.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate(event => {
      const nextScale = pinchStartScale.value * event.scale;
      scale.value = Math.min(1.45, Math.max(0.55, nextScale));
    });

  const canvasGesture = Gesture.Simultaneous(panGesture, pinchGesture);
  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetCanvas = useCallback(() => {
    scale.value = withTiming(INITIAL_SCALE);
    translateX.value = withTiming(INITIAL_TRANSLATE_X);
    translateY.value = withTiming(INITIAL_TRANSLATE_Y);
  }, [scale, translateX, translateY]);

  const openAddAction = () => {
    const nextIndex = actions.length;
    setActions(current => [
      ...current,
      {
        action_name: 'send_message',
        action_params: [''],
      },
    ]);
    setEditingNode({ type: 'action', index: nextIndex });
  };

  const updateCondition = (index: number, condition: AutomationCondition) => {
    setConditions(current => {
      const next = [...current];
      next[index] = condition;
      return next;
    });
  };

  const removeCondition = (index: number) => {
    setConditions(current => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateAction = (index: number, action: AutomationAction) => {
    setActions(current => {
      const next = [...current];
      next[index] = action;
      return next;
    });
  };

  const removeAction = (index: number) => {
    setActions(current => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const load = useCallback(async () => {
    if (!route.params?.automationId) return;
    const rules = await AutomationService.list();
    const current = rules.find(item => item.id === route.params?.automationId);
    if (current) {
      setRule(current);
      setName(current.name);
      setDescription(current.description || '');
      setEventName(current.event_name);
      setConditions(current.conditions || []);
      setActions(current.actions || []);
      setActive(current.active);
    }
  }, [route.params?.automationId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const created = await AutomationService.create({
        name,
        description,
        event_name: eventName,
        conditions,
        actions,
        active,
      });
      setRule(created);
      showToast({ message: 'Automação criada' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (nextActive: boolean) => {
    setActive(nextActive);
    if (!rule?.id) return;

    try {
      const updated = await AutomationService.update(rule.id, { active: nextActive });
      setRule(updated);
    } catch {
      setActive(!nextActive);
      showToast({ message: 'Não foi possível atualizar a automação' });
    }
  };

  const saveRule = async () => {
    if (!rule?.id) return;
    setSaving(true);
    try {
      const updated = await AutomationService.update(rule.id, {
        name,
        description,
        event_name: eventName,
        conditions,
        actions,
        active,
      });
      setRule(updated);
      showToast({ message: 'Automação salva' });
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = () => {
    if (!rule?.id) return;
    Alert.alert('Excluir automação', 'Esta automação será removida.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await AutomationService.destroy(rule.id);
          showToast({ message: 'Automação excluída' });
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header title={name} active={active} onToggle={toggleActive} />
      {loading ? (
        <Animated.View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator />
        </Animated.View>
      ) : (
        <>
          <Animated.View style={tailwind.style('flex-1 overflow-hidden bg-white')}>
            <CanvasBackground />
            <CanvasToolbar />
            <GestureDetector gesture={canvasGesture}>
              <Animated.View style={tailwind.style('flex-1')}>
                <Animated.View
                  style={[
                    tailwind.style('absolute left-0 top-0'),
                    { height: CANVAS_HEIGHT, width: CANVAS_WIDTH },
                    canvasStyle,
                  ]}>
                  <WorkflowConnectors
                    trigger={nodePositions.trigger}
                    condition={nodePositions.condition}
                    actionNodes={nodePositions.actionNodes}
                  />
                  <Animated.View
                    style={[
                      tailwind.style('absolute'),
                      { left: nodePositions.trigger.x, top: nodePositions.trigger.y },
                    ]}>
                    <FlowNode
                      label="Quando"
                      title={eventTitle(eventName)}
                      detail={description}
                      type="when"
                      color="#16A34A"
                      onPress={() => setEditingNode({ type: 'trigger' })}
                    />
                  </Animated.View>
                  <Animated.View
                    style={[
                      tailwind.style('absolute'),
                      { left: nodePositions.condition.x, top: nodePositions.condition.y },
                    ]}>
                    <FlowNode
                      label="Se"
                      title={conditionTitle(conditions[0])}
                      type="if"
                      color="#F59E0B"
                      onPress={() => setEditingNode({ type: 'condition', index: 0 })}
                    />
                  </Animated.View>
                  {actions.map((action, index) => (
                    <Animated.View
                      key={`${action.action_name}-${index}`}
                      style={[
                        tailwind.style('absolute'),
                        {
                          left: nodePositions.actionNodes[index].x,
                          top: nodePositions.actionNodes[index].y,
                        },
                      ]}>
                      <FlowNode
                        label="Fazer"
                        title={actionTitle(action)}
                        detail={actionDetail(action)}
                        type="do"
                        color={accent}
                        variant="wide"
                        onPress={() => setEditingNode({ type: 'action', index })}
                      />
                    </Animated.View>
                  ))}
                  <Animated.View
                    style={[
                      tailwind.style('absolute'),
                      { left: nodePositions.addButton.x, top: nodePositions.addButton.y },
                    ]}>
                    <AddStepButton onPress={openAddAction} />
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
            <CanvasControls onReset={resetCanvas} />
          </Animated.View>

          <StepEditorModal
            editingNode={editingNode}
            name={name}
            description={description}
            eventName={eventName}
            conditions={conditions}
            actions={actions}
            onClose={() => setEditingNode(null)}
            onChangeName={setName}
            onChangeDescription={setDescription}
            onChangeEvent={setEventName}
            onChangeCondition={updateCondition}
            onRemoveCondition={removeCondition}
            onChangeAction={updateAction}
            onRemoveAction={removeAction}
          />

          <Animated.View
            style={tailwind.style(
              'absolute bottom-0 left-0 right-0 border-t-[1px] border-t-blackA-A3 bg-white px-4 pt-3',
              `pb-[${TAB_BAR_HEIGHT + 8}px]`,
            )}>
            {rule?.id ? (
              <Animated.View style={tailwind.style('flex-row items-center gap-3')}>
                <Animated.View style={tailwind.style('flex-1')}>
                  <Button
                    text={saving ? 'Salvando...' : 'Salvar alterações'}
                    handlePress={saveRule}
                    disabled={saving}
                  />
                </Animated.View>
                <Pressable
                  onPress={deleteRule}
                  hitSlop={10}
                  style={tailwind.style(
                    'h-11 w-11 items-center justify-center rounded-[8px] bg-red-50',
                  )}>
                  <Icon icon={<Trash />} size={20} />
                </Pressable>
              </Animated.View>
            ) : (
              <Button
                text={saving ? 'Criando...' : 'Criar automação'}
                handlePress={saveDraft}
                disabled={saving}
              />
            )}
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
};

export default AutomationEditorScreen;
