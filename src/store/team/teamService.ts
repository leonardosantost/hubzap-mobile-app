import type { Team } from '@/types';
import { apiService } from '@/services/APIService';
import { transformTeam } from '@/utils/camelCaseKeys';

export class TeamService {
  static async getTeams(): Promise<Team[]> {
    const response = await apiService.get<Team[]>('teams');
    const teams = response.data.map(transformTeam);
    return teams;
  }

  static async createTeam(payload: {
    name: string;
    description?: string;
    allowAutoAssign?: boolean;
  }): Promise<Team> {
    const response = await apiService.post<Team>('teams', {
      team: {
        name: payload.name,
        description: payload.description,
        allow_auto_assign: payload.allowAutoAssign ?? true,
      },
    });
    return transformTeam(response.data);
  }

  static async updateTeam(
    teamId: number,
    payload: { name: string; description?: string; allowAutoAssign?: boolean },
  ): Promise<Team> {
    const response = await apiService.put<Team>(`teams/${teamId}`, {
      team: {
        name: payload.name,
        description: payload.description,
        allow_auto_assign: payload.allowAutoAssign ?? true,
      },
    });
    return transformTeam(response.data);
  }

  static async deleteTeam(teamId: number): Promise<void> {
    await apiService.delete(`teams/${teamId}`);
  }
}
