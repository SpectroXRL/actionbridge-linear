import { Test, TestingModule } from '@nestjs/testing';
import { LinearService } from './linear.service';
import { AiService } from '../ai/ai.service';
import { LinearIssue } from './linear-schema.interface';

const mockWorkflowStates = jest.fn();
const mockIssueLabels = jest.fn();
const mockCreateIssueBatch = jest.fn();

jest.mock('@linear/sdk', () => ({
  LinearClient: jest.fn().mockImplementation(() => ({
    workflowStates: mockWorkflowStates,
    issueLabels: mockIssueLabels,
    createIssueBatch: mockCreateIssueBatch,
  })),
}));

describe('LinearService', () => {
  let service: LinearService;

  const mockAiService = {
    generateItems: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCreateIssueBatch.mockResolvedValue({});

    mockWorkflowStates.mockResolvedValue({
      nodes: [
        { id: 'state-1', name: 'Todo' },
        { id: 'state-2', name: 'In Progress' },
      ],
    });
    mockIssueLabels.mockResolvedValue({
      nodes: [{ id: 'label-1', name: 'Bug' }],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinearService,
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<LinearService>(LinearService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('pullLinearMetadata()', () => {
    it('calls workflowStates() and issueLabels() on the LinearClient exactly once', async () => {
      await service.pullLinearMetadata();

      expect(mockWorkflowStates).toHaveBeenCalledTimes(1);
      expect(mockIssueLabels).toHaveBeenCalledTimes(1);
    });

    it('returns typed arrays of { id, name } for states and labels', async () => {
      const result = await service.pullLinearMetadata();

      expect(result.states).toEqual([
        { id: 'state-1', name: 'Todo' },
        { id: 'state-2', name: 'In Progress' },
      ]);
      expect(result.labels).toEqual([{ id: 'label-1', name: 'Bug' }]);
    });
  });

  describe('extractIssues()', () => {
    it('returns meta.states and meta.labels from pullLinearMetadata', async () => {
      mockAiService.generateItems.mockResolvedValue({ issues: [] });

      const result = await service.extractIssues('some content');

      expect(result.meta.states).toEqual([
        { id: 'state-1', name: 'Todo' },
        { id: 'state-2', name: 'In Progress' },
      ]);
      expect(result.meta.labels).toEqual([{ id: 'label-1', name: 'Bug' }]);
    });

    it('returns issues from AiService.generateItems', async () => {
      const fakeIssues = [
        {
          title: 'Fix login bug',
          description: 'Login fails',
          stateId: 'state-1',
          labelIds: ['label-1'],
        },
      ];
      mockAiService.generateItems.mockResolvedValue({ issues: fakeIssues });

      const result = await service.extractIssues('content');

      expect(result.issues).toEqual(fakeIssues);
    });
  });

  describe('submitIssues()', () => {
    it('calls createIssueBatch with issues augmented by teamId and projectId when both are provided', async () => {
      const issue = {
        title: 'Fix login',
        description: 'Login fails on mobile',
        stateId: 'state-1',
      };

      await service.submitIssues({
        issues: [issue],
        teamId: 'team-1',
        projectId: 'proj-1',
      });

      expect(mockCreateIssueBatch).toHaveBeenCalledWith({
        issues: [{ ...issue, teamId: 'team-1', projectId: 'proj-1' }],
      });
    });

    it('omits projectId from each issue when projectId is empty string', async () => {
      const issue = {
        title: 'Fix login',
        description: 'Login fails on mobile',
        stateId: 'state-1',
      };

      await service.submitIssues({
        issues: [issue],
        teamId: 'team-1',
        projectId: '',
      });

      expect(mockCreateIssueBatch).toHaveBeenCalledWith({
        issues: [{ ...issue, teamId: 'team-1' }],
      });
    });

    it('does not call createIssueBatch when issues array is empty', async () => {
      await service.submitIssues({
        issues: [],
        teamId: 'team-1',
        projectId: '',
      });

      expect(mockCreateIssueBatch).not.toHaveBeenCalled();
    });

    it('throws and does not call createIssueBatch when an issue is missing title', async () => {
      const invalidIssue = {
        description: 'no title here',
        stateId: 'state-1',
      } as unknown as LinearIssue;

      await expect(
        service.submitIssues({
          issues: [invalidIssue],
          teamId: 'team-1',
          projectId: '',
        }),
      ).rejects.toThrow();

      expect(mockCreateIssueBatch).not.toHaveBeenCalled();
    });

    it('throws and does not call createIssueBatch when teamId is empty', async () => {
      const issue = {
        title: 'Fix login',
        description: 'desc',
        stateId: 'state-1',
      };

      await expect(
        service.submitIssues({ issues: [issue], teamId: '', projectId: '' }),
      ).rejects.toThrow();

      expect(mockCreateIssueBatch).not.toHaveBeenCalled();
    });
  });
});
