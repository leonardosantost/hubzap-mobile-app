import { apiService } from '@/services/APIService';
import type { CannedResponseResponse } from './cannedResponseTypes';
import { transformCannedResponse } from '@/utils/camelCaseKeys';
import { CannedResponse } from '@/types';

export class CannedResponseService {
  static async index(searchKey: string): Promise<CannedResponseResponse> {
    const url = searchKey ? `canned_responses?search=${searchKey}` : 'canned_responses';
    const response = await apiService.get<CannedResponse[]>(url);
    const cannedResponses = response.data.map(transformCannedResponse);
    return {
      payload: cannedResponses,
    };
  }

  static async create(payload: { shortCode: string; content: string }): Promise<CannedResponse> {
    const response = await apiService.post<CannedResponse>('canned_responses', {
      canned_response: {
        short_code: payload.shortCode,
        content: payload.content,
      },
    });
    return transformCannedResponse(response.data);
  }

  static async update(
    id: number,
    payload: { shortCode: string; content: string },
  ): Promise<CannedResponse> {
    const response = await apiService.put<CannedResponse>(`canned_responses/${id}`, {
      canned_response: {
        short_code: payload.shortCode,
        content: payload.content,
      },
    });
    return transformCannedResponse(response.data);
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`canned_responses/${id}`);
  }
}
