import { LinearClient } from '@linear/sdk';
import z from 'zod';

interface LinearMetadata {
  states: string;
  labels: string;
}

async function pullLinearMetadata(): Promise<LinearMetadata> {
  const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
  });

  const [workflowStates, issueLabels] = await Promise.all([
    linearClient.workflowStates(),
    linearClient.issueLabels(),
  ]);

  const states = workflowStates.nodes.map((state) => ({
    id: state.id,
    name: state.name,
    type: state.type,
  }));

  const labels = issueLabels.nodes.map((state) => ({
    id: state.id,
    name: state.name,
  }));

  return {
    states: JSON.stringify(states),
    labels: JSON.stringify(labels),
  };
}

export const linearIssueBaseSchema = z.object({
  title: z.string(),
  description: z.string(),
  stateId: z.string(),
  labelIds: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.array(z.string()).optional(),
  ),
});

export function createLinearIssueSchema(
  statesInfo: string,
  labelsInfo: string,
) {
  return linearIssueBaseSchema.extend({
    title: linearIssueBaseSchema.shape.title.describe(
      'Title of the task/issue',
    ),
    description: linearIssueBaseSchema.shape.description.describe(
      'A short description giving details supporting the issue title',
    ),
    stateId: linearIssueBaseSchema.shape.stateId.describe(
      'The state id representing the current workflow state this item is in, use key words that would give you clues into what the state is like similes between the word and the states use the ids given: ' +
        statesInfo,
    ),
    labelIds: z
      .array(z.string())
      .nullable()
      .optional()
      .describe(
        'The optional label ids to apply to this issue, use the ids given: ' +
          labelsInfo,
      ),
  });
}

export async function getLinearSchemas() {
  const statesInfo = await pullLinearMetadata();
  const linearIssueSchema = createLinearIssueSchema(
    statesInfo.states,
    statesInfo.labels,
  );
  const linearIssuesSchema = z.object({
    issues: z.array(linearIssueSchema),
  });
  return { linearIssueSchema, linearIssuesSchema };
}

export type LinearIssue = z.infer<typeof linearIssueBaseSchema>;
export type LinearIssues = { issues: LinearIssue[] };
