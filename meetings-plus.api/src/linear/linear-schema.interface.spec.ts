import {
  createLinearIssueSchema,
  linearIssueBaseSchema,
} from './linear-schema.interface';

describe('linearIssueBaseSchema', () => {
  it('parses valid input with null labelIds and normalises to undefined', () => {
    const result = linearIssueBaseSchema.parse({
      title: 't',
      description: 'd',
      stateId: 's',
      labelIds: null,
    });

    expect(result).toEqual({
      title: 't',
      description: 'd',
      stateId: 's',
      labelIds: undefined,
    });
  });

  it('parses valid input with no labelIds and returns labelIds as undefined', () => {
    const result = linearIssueBaseSchema.parse({
      title: 't',
      description: 'd',
      stateId: 's',
    });

    expect(result).toEqual({
      title: 't',
      description: 'd',
      stateId: 's',
      labelIds: undefined,
    });
  });

  it('parses valid input with a labelIds array and preserves it', () => {
    const result = linearIssueBaseSchema.parse({
      title: 't',
      description: 'd',
      stateId: 's',
      labelIds: ['id-1'],
    });

    expect(result).toEqual({
      title: 't',
      description: 'd',
      stateId: 's',
      labelIds: ['id-1'],
    });
  });

  it('throws when title is missing', () => {
    expect(() =>
      linearIssueBaseSchema.parse({ description: 'd', stateId: 's' }),
    ).toThrow();
  });
});

describe('createLinearIssueSchema', () => {
  it('embeds statesInfo in the stateId field description', () => {
    const schema = createLinearIssueSchema('state-info-sentinel', 'labels');
    expect(schema.shape.stateId.description).toContain('state-info-sentinel');
  });

  it('embeds labelsInfo in the labelIds field description', () => {
    const schema = createLinearIssueSchema('states', 'label-info-sentinel');
    expect(schema.shape.labelIds.description).toContain('label-info-sentinel');
  });

  it('parses a valid complete issue', () => {
    const schema = createLinearIssueSchema('states', 'labels');
    const result = schema.parse({
      title: 'Fix bug',
      description: 'Something broke',
      stateId: 'state-1',
      labelIds: ['label-1'],
    });
    expect(result).toEqual({
      title: 'Fix bug',
      description: 'Something broke',
      stateId: 'state-1',
      labelIds: ['label-1'],
    });
  });

  it('output is accepted by linearIssueBaseSchema (structural compatibility)', () => {
    const schema = createLinearIssueSchema('states', 'labels');
    const parsed = schema.parse({
      title: 'Fix bug',
      description: 'Something broke',
      stateId: 'state-1',
      labelIds: null,
    });
    expect(() => linearIssueBaseSchema.parse(parsed)).not.toThrow();
  });
});
