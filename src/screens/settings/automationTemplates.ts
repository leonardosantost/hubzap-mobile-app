import type { AutomationPayload } from '@/store/automation/automationService';

export type AutomationTemplate = AutomationPayload & {
  key: string;
  category: string;
  accent: string;
};

export const automationTemplates: AutomationTemplate[] = [
  {
    key: 'contact-follow-up',
    category: 'Relacionamento',
    accent: '#2563EB',
    name: 'Follow-up de contatos',
    description: 'Marca conversas abertas para acompanhamento quando entra uma nova conversa.',
    event_name: 'conversation_created',
    active: true,
    conditions: [
      {
        attribute_key: 'status',
        filter_operator: 'equal_to',
        values: ['open'],
        query_operator: '',
        custom_attribute_type: '',
      },
    ],
    actions: [
      { action_name: 'add_label', action_params: ['follow-up'] },
      {
        action_name: 'add_private_note',
        action_params: ['Novo follow-up criado automaticamente. Revise o contato e defina a próxima ação.'],
      },
    ],
  },
  {
    key: 'open-order-collection',
    category: 'Vendas',
    accent: '#F59E0B',
    name: 'Cobrança de pedido em aberto',
    description: 'Quando uma conversa recebe a etiqueta pedido-em-aberto, envia uma cobrança curta.',
    event_name: 'conversation_updated',
    active: true,
    conditions: [
      {
        attribute_key: 'labels',
        filter_operator: 'contains',
        values: ['pedido-em-aberto'],
        query_operator: '',
        custom_attribute_type: '',
      },
    ],
    actions: [
      {
        action_name: 'send_message',
        action_params: ['Olá! Passando para lembrar que seu pedido ainda está em aberto. Posso te ajudar a finalizar?'],
      },
    ],
  },
  {
    key: 'appointment-reminder',
    category: 'Agenda',
    accent: '#16A34A',
    name: 'Lembrete de agendamento',
    description: 'Etiqueta conversas de agendamento e envia confirmação quando forem criadas.',
    event_name: 'conversation_created',
    active: true,
    conditions: [
      {
        attribute_key: 'labels',
        filter_operator: 'contains',
        values: ['agendamento'],
        query_operator: '',
        custom_attribute_type: '',
      },
    ],
    actions: [
      {
        action_name: 'send_message',
        action_params: ['Seu agendamento foi registrado. Enviaremos um lembrete antes do horário combinado.'],
      },
    ],
  },
  {
    key: 'tracking-status',
    category: 'Pedidos',
    accent: '#7C3AED',
    name: 'Rastreio e status do pedido',
    description: 'Responde conversas com etiqueta rastreio com orientação sobre o status do pedido.',
    event_name: 'message_created',
    active: true,
    conditions: [
      {
        attribute_key: 'labels',
        filter_operator: 'contains',
        values: ['rastreio'],
        query_operator: '',
        custom_attribute_type: '',
      },
    ],
    actions: [
      {
        action_name: 'send_message',
        action_params: ['Vou consultar o status do seu pedido e te retorno por aqui.'],
      },
    ],
  },
];
