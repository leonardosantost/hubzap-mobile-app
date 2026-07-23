import { apiService } from '@/services/APIService';

export type AutomationCondition = {
  attribute_key: string;
  filter_operator: string;
  values: string[] | string;
  query_operator?: 'and' | 'or' | '';
  custom_attribute_type?: string;
};

export type AutomationAction = {
  action_name: string;
  action_params: string[] | Array<Record<string, unknown>>;
};

export type AutomationRule = {
  id: number;
  account_id: number;
  name: string;
  description?: string;
  event_name: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  active: boolean;
  created_on?: number;
};

type AutomationRulesResponse = {
  payload: AutomationRule[];
};

type AutomationRuleResponse = {
  payload: AutomationRule;
};

export type AutomationPayload = {
  name: string;
  description?: string;
  event_name: string;
  active: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

export class AutomationService {
  static async list(): Promise<AutomationRule[]> {
    const response = await apiService.get<AutomationRulesResponse>('automation_rules');
    return response.data.payload;
  }

  static async create(payload: AutomationPayload): Promise<AutomationRule> {
    const response = await apiService.post<AutomationRuleResponse>('automation_rules', payload);
    return response.data.payload;
  }

  static async update(id: number, payload: Partial<AutomationPayload>): Promise<AutomationRule> {
    const response = await apiService.put<AutomationRuleResponse>(`automation_rules/${id}`, payload);
    return response.data.payload;
  }

  static async destroy(id: number): Promise<void> {
    await apiService.delete(`automation_rules/${id}`);
  }
}
