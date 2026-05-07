import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LinearController } from './linear.controller';
import { LinearService } from './linear.service';
import { FileService } from '../file/file.service';
import { ConfigService } from '@nestjs/config';
import { LinearIssue } from './linear-schema.interface';

describe('LinearController', () => {
  let controller: LinearController;

  const mockLinearService = {
    extractIssues: jest.fn(),
    submitIssues: jest.fn(),
  };
  const mockFileService = {
    processContent: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinearController],
      providers: [
        { provide: LinearService, useValue: mockLinearService },
        { provide: FileService, useValue: mockFileService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<LinearController>(LinearController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /extract', () => {
    it('returns { issues, meta } from extractIssues', async () => {
      const fakeResult = {
        issues: [
          {
            title: 'Fix bug',
            description: 'desc',
            stateId: 'state-1',
            labelIds: [],
          },
        ],
        meta: {
          states: [{ id: 'state-1', name: 'Todo' }],
          labels: [{ id: 'label-1', name: 'Bug' }],
        },
      };
      mockFileService.processContent.mockReturnValue('transcript text');
      mockLinearService.extractIssues.mockResolvedValue(fakeResult);

      const result = await controller.postExtract(
        { teamId: 'team-1', projectId: 'proj-1' },
        undefined,
      );

      expect(result).toEqual(fakeResult);
    });
  });

  it('does not have a postTranscript method', () => {
    expect('postTranscript' in controller).toBe(false);
  });

  describe('POST /issues', () => {
    it('calls submitIssues and returns undefined (204 body) on valid payload', async () => {
      mockLinearService.submitIssues.mockResolvedValue(undefined);
      const body = {
        issues: [{ title: 'Fix bug', description: 'desc', stateId: 'state-1' }],
        teamId: 'team-1',
        projectId: 'proj-1',
      };

      const result = await controller.postIssues(body);

      expect(mockLinearService.submitIssues).toHaveBeenCalledWith(body);
      expect(result).toBeUndefined();
    });

    it('propagates BadRequestException when submitIssues throws', async () => {
      mockLinearService.submitIssues.mockRejectedValue(
        new BadRequestException('validation failed'),
      );

      await expect(
        controller.postIssues({
          issues: [] as unknown as LinearIssue[],
          teamId: '',
          projectId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
