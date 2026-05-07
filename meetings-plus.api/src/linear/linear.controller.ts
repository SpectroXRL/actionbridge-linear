import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileService } from 'src/file/file.service';
import { LinearService } from './linear.service';
import { LinearIssue } from './linear-schema.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

const REDIRECT_URI = 'http://localhost:3000/linear/callback';

interface TranscriptDto {
  teamId: string;
  projectId: string;
}

@Controller('linear')
export class LinearController {
  constructor(
    private readonly fileService: FileService,
    private readonly linearService: LinearService,
    private readonly configService: ConfigService,
  ) {}

  @Post('/extract')
  @UseInterceptors(FileInterceptor('transcript'))
  async postExtract(
    @Body() body: TranscriptDto,
    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    const content = this.fileService.processContent(file);
    return this.linearService.extractIssues(content);
  }

  @Get('callback')
  async getCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    // Exchange code for access token
    const response = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.configService.get<string>('LINEAR_CLIENT_ID') ?? '',
        client_secret:
          this.configService.get<string>('LINEAR_CLIENT_SECRET') ?? '',
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
    });

    const { access_token } = (await response.json()) as {
      access_token: string;
    };

    this.linearService.setAccessToken(access_token);

    if (access_token !== undefined) {
      return res.redirect(`http://localhost:5173/linear`);
    } else {
      return res.redirect(`http://localhost:5173`);
    }
  }

  @Get('status')
  getStatus() {
    return { connected: this.linearService.isConnected() };
  }

  @Get('teams')
  async getTeams() {
    return await this.linearService.getTeams();
  }

  @Get('projects')
  async getProjects(@Query('teamId') teamId: string) {
    return await this.linearService.getProjects(teamId);
  }

  @Post('issues')
  @HttpCode(204)
  async postIssues(
    @Body() body: { issues: LinearIssue[]; teamId: string; projectId: string },
  ): Promise<void> {
    return this.linearService.submitIssues(body);
  }
}
