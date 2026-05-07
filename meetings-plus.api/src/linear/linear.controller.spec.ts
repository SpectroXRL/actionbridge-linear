import { Test, TestingModule } from '@nestjs/testing';
import { LinearController } from './linear.controller';
import { LinearService } from './linear.service';
import { FileService } from '../file/file.service';
import { ConfigService } from '@nestjs/config';

describe('LinearController', () => {
  let controller: LinearController;

  const mockLinearService = {
    extractIssues: jest.fn(),
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
});
