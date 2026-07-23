import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Avatar, Icon } from '@/components-next';
import { TAB_BAR_HEIGHT } from '@/constants';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { apiService } from '@/services/APIService';
import { authActions } from '@/store/auth/authActions';
import { selectUser } from '@/store/auth/authSelectors';
import { CannedResponseService } from '@/store/canned-response/cannedResponseService';
import { CustomAttributeService } from '@/store/custom-attribute/customAttributeService';
import { TaskService } from '@/store/task/taskService';
import { TeamService } from '@/store/team/teamService';
import { Agent, CannedResponse, CustomAttribute, Team } from '@/types';
import { ChevronLeft, Trash } from '@/svg-icons';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';

type Option = { label: string; value: string };

const attributeTypeOptions: Option[] = [
  { label: 'Texto', value: 'text' },
  { label: 'Número', value: 'number' },
  { label: 'Lista', value: 'list' },
  { label: 'Data', value: 'date' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Link', value: 'link' },
];

const attributeModelOptions: Option[] = [
  { label: 'Contato', value: 'contact_attribute' },
  { label: 'Conversa', value: 'conversation_attribute' },
];

const Header = ({ title }: { title: string }) => {
  const navigation = useNavigation();

  return (
    <View style={tailwind.style('border-b border-blackA-A3 bg-white')}>
      <View style={tailwind.style('flex-row items-center px-4 pt-2 pb-3')}>
        <View style={tailwind.style('flex-1 items-start')}>
          <Pressable hitSlop={16} onPress={() => navigation.goBack()}>
            <Icon icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} size={24} />
          </Pressable>
        </View>
        <Text
          numberOfLines={1}
          style={tailwind.style(
            'flex-[2] text-center text-[17px] font-inter-semibold-24 text-gray-950',
          )}>
          {title}
        </Text>
        <View style={tailwind.style('flex-1')} />
      </View>
    </View>
  );
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) => (
  <View style={tailwind.style('mb-4')}>
    <Text style={tailwind.style('mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={tailwind.color('text-gray-500')}
      multiline={multiline}
      style={tailwind.style(
        'rounded-[8px] border border-blackA-A3 px-3 py-3 text-base text-gray-950',
        multiline ? 'min-h-[88px]' : '',
      )}
    />
  </View>
);

const PrimaryButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={tailwind.style(
      'h-11 items-center justify-center rounded-[8px] bg-blue-800',
      disabled ? 'opacity-50' : '',
    )}>
    <Text style={tailwind.style('text-base font-inter-semibold-24 text-white')}>{label}</Text>
  </Pressable>
);

const EmptyState = ({ text }: { text: string }) => (
  <Text style={tailwind.style('px-4 py-6 text-center text-sm text-gray-700')}>{text}</Text>
);

const SegmentedOptions = ({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <View style={tailwind.style('mb-4 flex-row flex-wrap gap-2')}>
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
          <Text style={tailwind.style('text-sm', selected ? 'text-blue-800' : 'text-gray-700')}>
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

export const ProfileSettingsScreen = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [name, setName] = useState(user?.name || '');
  const [displayName, setDisplayName] = useState(user?.available_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiService.put('profile', {
        profile: {
          name,
          display_name: displayName,
          email,
          account_id: user?.account_id,
        },
      });
      await dispatch(authActions.getProfile());
      showToast({ message: 'Perfil atualizado' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header title="Perfil" />
      <ScrollView contentContainerStyle={tailwind.style(`px-4 pt-5 pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        <View style={tailwind.style('items-center pb-6')}>
          <Avatar
            size="lg"
            src={user?.avatar_url ? { uri: user.avatar_url } : undefined}
            name={name}
          />
        </View>
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Nome completo" />
        <Field
          label="Nome público"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Como aparece nas conversas"
        />
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="email@empresa.com"
        />
        <PrimaryButton
          label={saving ? 'Salvando...' : 'Salvar perfil'}
          onPress={save}
          disabled={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export const UsersAndTeamsSettingsScreen = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [allowAutoAssign, setAllowAutoAssign] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextAgents, nextTeams] = await Promise.all([
        TaskService.getAgents(),
        TeamService.getTeams(),
      ]);
      setAgents(nextAgents);
      setTeams(nextTeams);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAgent = async () => {
    if (!agentName.trim() || !agentEmail.trim()) return;
    if (editingAgent) {
      await apiService.put(`agents/${editingAgent.id}`, {
        agent: {
          name: agentName.trim(),
          role: editingAgent.role || 'agent',
          availability: editingAgent.availabilityStatus || 'offline',
        },
      });
    } else {
      await apiService.post('agents', {
        agent: {
          name: agentName.trim(),
          email: agentEmail.trim(),
          role: 'agent',
          availability: 'offline',
        },
      });
    }
    setEditingAgent(null);
    setAgentName('');
    setAgentEmail('');
    await load();
    showToast({ message: editingAgent ? 'Usuário atualizado' : 'Usuário convidado' });
  };

  const deleteAgent = (agent: Agent) => {
    Alert.alert('Remover usuário', `Remover ${agent.name || agent.email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await apiService.delete(`agents/${agent.id}`);
          if (editingAgent?.id === agent.id) {
            setEditingAgent(null);
            setAgentName('');
            setAgentEmail('');
          }
          await load();
        },
      },
    ]);
  };

  const createTeam = async () => {
    if (!teamName.trim()) return;
    if (editingTeam) {
      await TeamService.updateTeam(editingTeam.id, {
        name: teamName.trim(),
        description: teamDescription.trim(),
        allowAutoAssign,
      });
    } else {
      await TeamService.createTeam({
        name: teamName.trim(),
        description: teamDescription.trim(),
        allowAutoAssign,
      });
    }
    setEditingTeam(null);
    setTeamName('');
    setTeamDescription('');
    setAllowAutoAssign(true);
    await load();
    showToast({ message: editingTeam ? 'Time atualizado' : 'Time criado' });
  };

  const deleteTeam = (team: Team) => {
    Alert.alert('Remover time', `Remover ${team.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await TeamService.deleteTeam(team.id);
          if (editingTeam?.id === team.id) {
            setEditingTeam(null);
            setTeamName('');
            setTeamDescription('');
            setAllowAutoAssign(true);
          }
          await load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header title="Usuários e Times" />
      <ScrollView contentContainerStyle={tailwind.style(`px-4 pt-5 pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        <Text style={tailwind.style('mb-3 text-base font-inter-semibold-24 text-gray-950')}>
          {editingAgent ? 'Editar usuário' : 'Novo usuário'}
        </Text>
        <Field label="Nome" value={agentName} onChangeText={setAgentName} />
        <Field
          label="E-mail"
          value={agentEmail}
          onChangeText={setAgentEmail}
          placeholder={editingAgent ? 'E-mail não pode ser alterado aqui' : undefined}
        />
        <PrimaryButton
          label={editingAgent ? 'Salvar usuário' : 'Convidar usuário'}
          onPress={createAgent}
          disabled={!agentName.trim() || !agentEmail.trim()}
        />
        {editingAgent ? (
          <Pressable
            onPress={() => {
              setEditingAgent(null);
              setAgentName('');
              setAgentEmail('');
            }}
            style={tailwind.style('items-center py-3')}>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-700')}>
              Cancelar edição
            </Text>
          </Pressable>
        ) : null}

        <Text style={tailwind.style('mt-7 mb-3 text-base font-inter-semibold-24 text-gray-950')}>
          {editingTeam ? 'Editar time' : 'Novo time'}
        </Text>
        <Field label="Nome do time" value={teamName} onChangeText={setTeamName} />
        <Field
          label="Descrição"
          value={teamDescription}
          onChangeText={setTeamDescription}
          multiline
        />
        <View style={tailwind.style('mb-4 flex-row items-center justify-between')}>
          <Text style={tailwind.style('text-sm text-gray-800')}>Distribuição automática</Text>
          <Switch value={allowAutoAssign} onValueChange={setAllowAutoAssign} />
        </View>
        <PrimaryButton
          label={editingTeam ? 'Salvar time' : 'Criar time'}
          onPress={createTeam}
          disabled={!teamName.trim()}
        />
        {editingTeam ? (
          <Pressable
            onPress={() => {
              setEditingTeam(null);
              setTeamName('');
              setTeamDescription('');
              setAllowAutoAssign(true);
            }}
            style={tailwind.style('items-center py-3')}>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-gray-700')}>
              Cancelar edição
            </Text>
          </Pressable>
        ) : null}

        <Text style={tailwind.style('mt-7 mb-3 text-base font-inter-semibold-24 text-gray-950')}>
          Usuários
        </Text>
        {loading ? <ActivityIndicator /> : null}
        {!loading && agents.length === 0 ? <EmptyState text="Nenhum usuário encontrado." /> : null}
        {agents.map(agent => (
          <Pressable
            key={agent.id}
            onPress={() => {
              setEditingAgent(agent);
              setAgentName(agent.name || '');
              setAgentEmail(agent.email || '');
            }}
            style={tailwind.style('flex-row items-center border-b border-blackA-A3 py-3')}>
            <Avatar
              size="sm"
              src={agent.thumbnail ? { uri: agent.thumbnail } : undefined}
              name={agent.name || ''}
            />
            <View style={tailwind.style('ml-3 flex-1')}>
              <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                {agent.name || agent.email}
              </Text>
              <Text style={tailwind.style('text-sm text-gray-700')}>
                {agent.email || agent.role}
              </Text>
            </View>
            <Pressable hitSlop={12} onPress={() => deleteAgent(agent)}>
              <Icon icon={<Trash />} size={18} />
            </Pressable>
          </Pressable>
        ))}

        <Text style={tailwind.style('mt-7 mb-3 text-base font-inter-semibold-24 text-gray-950')}>
          Times
        </Text>
        {teams.map(team => (
          <Pressable
            key={team.id}
            onPress={() => {
              setEditingTeam(team);
              setTeamName(team.name);
              setTeamDescription(team.description || '');
              setAllowAutoAssign(team.allowAutoAssign);
            }}
            style={tailwind.style('border-b border-blackA-A3 py-3')}>
            <View style={tailwind.style('flex-row items-center')}>
              <View style={tailwind.style('flex-1')}>
                <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                  {team.name}
                </Text>
                <Text style={tailwind.style('text-sm text-gray-700')}>
                  {team.description || 'Sem descrição'}
                </Text>
              </View>
              <Pressable hitSlop={12} onPress={() => deleteTeam(team)}>
                <Icon icon={<Trash />} size={18} />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export const CannedResponsesSettingsScreen = () => {
  const [items, setItems] = useState<CannedResponse[]>([]);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [shortCode, setShortCode] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await CannedResponseService.index('');
      setItems(response.payload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (item: CannedResponse) => {
    setEditing(item);
    setShortCode(item.shortCode);
    setContent(item.content);
  };

  const reset = () => {
    setEditing(null);
    setShortCode('');
    setContent('');
  };

  const save = async () => {
    if (!shortCode.trim() || !content.trim()) return;
    if (editing) {
      await CannedResponseService.update(editing.id, {
        shortCode: shortCode.trim(),
        content: content.trim(),
      });
    } else {
      await CannedResponseService.create({ shortCode: shortCode.trim(), content: content.trim() });
    }
    reset();
    await load();
  };

  const remove = async () => {
    if (!editing) return;
    await CannedResponseService.delete(editing.id);
    reset();
    await load();
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header title="Respostas Rápidas" />
      <ScrollView contentContainerStyle={tailwind.style(`px-4 pt-5 pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        <Field
          label="Atalho"
          value={shortCode}
          onChangeText={setShortCode}
          placeholder="ex: saudacao"
        />
        <Field label="Mensagem" value={content} onChangeText={setContent} multiline />
        <PrimaryButton
          label={editing ? 'Salvar resposta' : 'Criar resposta'}
          onPress={save}
          disabled={!shortCode.trim() || !content.trim()}
        />
        {editing ? (
          <Pressable onPress={remove} style={tailwind.style('mt-3 items-center py-2')}>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-red-700')}>
              Excluir resposta
            </Text>
          </Pressable>
        ) : null}
        {loading ? <ActivityIndicator style={tailwind.style('mt-6')} /> : null}
        {items.map(item => (
          <Pressable
            key={item.id}
            onPress={() => edit(item)}
            style={tailwind.style('border-b border-blackA-A3 py-3')}>
            <Text style={tailwind.style('text-base font-inter-semibold-24 text-gray-950')}>
              /{item.shortCode}
            </Text>
            <Text numberOfLines={2} style={tailwind.style('pt-1 text-sm text-gray-700')}>
              {item.content}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export const CustomAttributesSettingsScreen = () => {
  const [items, setItems] = useState<CustomAttribute[]>([]);
  const [editing, setEditing] = useState<CustomAttribute | null>(null);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('text');
  const [model, setModel] = useState('contact_attribute');
  const [values, setValues] = useState('');

  const load = useCallback(async () => {
    const response = await CustomAttributeService.index();
    setItems(response.payload);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setEditing(null);
    setName('');
    setKey('');
    setDescription('');
    setType('text');
    setModel('contact_attribute');
    setValues('');
  };

  const edit = (item: CustomAttribute) => {
    setEditing(item);
    setName(item.attributeDisplayName);
    setKey(item.attributeKey);
    setDescription(item.attributeDescription || '');
    setType(item.attributeDisplayType || 'text');
    setModel(item.attributeModel || 'contact_attribute');
    setValues((item.attributeValues || []).join(', '));
  };

  const payload = () => ({
    attributeDisplayName: name.trim(),
    attributeDescription: description.trim(),
    attributeDisplayType: type,
    attributeKey: key.trim(),
    attributeModel: model,
    attributeValues: values
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  });

  const save = async () => {
    if (!name.trim() || !key.trim()) return;
    if (editing) {
      await CustomAttributeService.update(editing.id, payload());
    } else {
      await CustomAttributeService.create(payload());
    }
    reset();
    await load();
  };

  const remove = async () => {
    if (!editing) return;
    await CustomAttributeService.delete(editing.id);
    reset();
    await load();
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header title="Atributos" />
      <ScrollView contentContainerStyle={tailwind.style(`px-4 pt-5 pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex: CPF" />
        <Field label="Chave" value={key} onChangeText={setKey} placeholder="ex: cpf" />
        <Field label="Descrição" value={description} onChangeText={setDescription} multiline />
        <Text style={tailwind.style('mb-2 text-sm font-inter-medium-24 text-gray-800')}>Tipo</Text>
        <SegmentedOptions options={attributeTypeOptions} value={type} onChange={setType} />
        <Text style={tailwind.style('mb-2 text-sm font-inter-medium-24 text-gray-800')}>
          Onde aparece
        </Text>
        <SegmentedOptions options={attributeModelOptions} value={model} onChange={setModel} />
        {type === 'list' ? (
          <Field
            label="Opções"
            value={values}
            onChangeText={setValues}
            placeholder="Novo, Pago, Cancelado"
          />
        ) : null}
        <PrimaryButton
          label={editing ? 'Salvar atributo' : 'Criar atributo'}
          onPress={save}
          disabled={!name.trim() || !key.trim()}
        />
        {editing ? (
          <Pressable onPress={remove} style={tailwind.style('mt-3 items-center py-2')}>
            <Text style={tailwind.style('text-sm font-inter-semibold-24 text-red-700')}>
              Excluir atributo
            </Text>
          </Pressable>
        ) : null}
        {items.map(item => (
          <Pressable
            key={item.id}
            onPress={() => edit(item)}
            style={tailwind.style('border-b border-blackA-A3 py-3')}>
            <Text style={tailwind.style('text-base font-inter-semibold-24 text-gray-950')}>
              {item.attributeDisplayName}
            </Text>
            <Text style={tailwind.style('pt-1 text-sm text-gray-700')}>
              {item.attributeKey} ·{' '}
              {item.attributeModel === 'contact_attribute' ? 'Contato' : 'Conversa'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
