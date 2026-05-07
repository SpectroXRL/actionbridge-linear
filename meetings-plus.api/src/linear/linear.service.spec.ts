import { Test, TestingModule } from '@nestjs/testing';
import { LinearService } from './linear.service';
import { AiService } from '../ai/ai.service';

const mockWorkflowStates = jest.fn();
const mockIssueLabels = jest.fn();

jest.mock('@linear/sdk', () => ({
  LinearClient: jest.fn().mockImplementation(() => ({
    workflowStates: mockWorkflowStates,
    issueLabels: mockIssueLabels,
  })),
}));

describe('LinearService', () => {
  let service: LinearService;

  const mockAiService = {
    generateItems: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
});
