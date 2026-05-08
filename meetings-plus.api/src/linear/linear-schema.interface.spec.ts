import { linearIssueBaseSchema } from './linear-schema.interface';

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
