import { apiService } from '@/services/APIService';
import type { CustomAttributeResponse } from './customAttributeTypes';
import { transformCustomAttribute } from '@/utils/camelCaseKeys';
import { CustomAttribute } from '@/types';

export class CustomAttributeService {
  static async index(): Promise<CustomAttributeResponse> {
    const response = await apiService.get<CustomAttribute[]>('custom_attribute_definitions');
    const customAttributes = response.data.map(transformCustomAttribute);
    return {
      payload: customAttributes,
    };
  }

  static async create(payload: {
    attributeDisplayName: string;
    attributeDescription?: string;
    attributeDisplayType: string;
    attributeKey: string;
    attributeModel: string;
    attributeValues?: string[];
  }): Promise<CustomAttribute> {
    const response = await apiService.post<CustomAttribute>('custom_attribute_definitions', {
      custom_attribute_definition: {
        attribute_display_name: payload.attributeDisplayName,
        attribute_description: payload.attributeDescription,
        attribute_display_type: payload.attributeDisplayType,
        attribute_key: payload.attributeKey,
        attribute_model: payload.attributeModel,
        attribute_values: payload.attributeValues || [],
      },
    });
    return transformCustomAttribute(response.data);
  }

  static async update(
    id: number,
    payload: {
      attributeDisplayName: string;
      attributeDescription?: string;
      attributeDisplayType: string;
      attributeKey: string;
      attributeModel: string;
      attributeValues?: string[];
    },
  ): Promise<CustomAttribute> {
    const response = await apiService.put<CustomAttribute>(`custom_attribute_definitions/${id}`, {
      custom_attribute_definition: {
        attribute_display_name: payload.attributeDisplayName,
        attribute_description: payload.attributeDescription,
        attribute_display_type: payload.attributeDisplayType,
        attribute_key: payload.attributeKey,
        attribute_model: payload.attributeModel,
        attribute_values: payload.attributeValues || [],
      },
    });
    return transformCustomAttribute(response.data);
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`custom_attribute_definitions/${id}`);
  }
}
