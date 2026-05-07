import { BadRequestException, Injectable } from '@nestjs/common';
import { LinearClient } from '@linear/sdk';
import z from 'zod';
import { AiService } from 'src/ai/ai.service';
import { getLinearSchemas, LinearIssue } from './linear-schema.interface';

const submitIssuesBodySchema = z.object({
  issues: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      stateId: z.string(),
      labelIds: z.array(z.string()).optional(),
    }),
  ),
  teamId: z.string().min(1),
  projectId: z.string(),
});

@Injectable()
export class LinearService {
  private linearClient: LinearClient;
  private accessToken: string | null = null;

  constructor(private readonly aiService: AiService) {
    this.linearClient = new LinearClient({
      apiKey: process.env.LINEAR_API_KEY,
    });
  }

  setAccessToken(token: string): void {
    this.accessToken = token;

    this.linearClient = new LinearClient({
      accessToken: token,
    });
  }

  getAccessToken(): string {
    return this.accessToken ?? '';
  }

  isConnected(): boolean {
    return this.accessToken !== null;
  }

  async pullLinearMetadata(): Promise<{
    states: Array<{ id: string; name: string }>;
    labels: Array<{ id: string; name: string }>;
  }> {
    const [workflowStates, issueLabels] = await Promise.all([
      this.linearClient.workflowStates(),
      this.linearClient.issueLabels(),
    ]);

    const states = workflowStates.nodes.map((s) => ({
      id: s.id,
      name: s.name,
    }));
    const labels = issueLabels.nodes.map((l) => ({ id: l.id, name: l.name }));

    return { states, labels };
  }

  async extractIssues(content: string | undefined): Promise<{
    issues: LinearIssue[];
    meta: {
      states: Array<{ id: string; name: string }>;
      labels: Array<{ id: string; name: string }>;
    };
  }> {
    const meta = await this.pullLinearMetadata();
    const { linearIssuesSchema } = await getLinearSchemas();
    const { issues } = await this.aiService.generateItems(
      content,
      linearIssuesSchema,
    );
    return { issues, meta };
  }

  async submitIssues(body: {
    issues: LinearIssue[];
    teamId: string;
    projectId: string;
  }): Promise<void> {
    const parsed = submitIssuesBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    if (body.issues.length === 0) return;

    const issuesWithTeam = body.issues.map((issue) => ({
      ...issue,
      teamId: body.teamId,
      ...(body.projectId !== '' ? { projectId: body.projectId } : {}),
    }));

    await this.linearClient.createIssueBatch({ issues: issuesWithTeam });
  }

  async getTeams() {
    const teams = await this.linearClient.teams();
    return teams;
  }

  async getProjects(id: string) {
    const team = (await this.linearClient.teams()).nodes.filter(
      (team) => team.id === id,
    )[0];
    const projects = await team.projects();
    return projects;
  }
}
