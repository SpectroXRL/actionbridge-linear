import { Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';

@Injectable()
export class AiService {
  private readonly ai: OpenAI;
  private readonly basePrompt: string;

  constructor() {
    this.ai = new OpenAI();

    this.basePrompt = `
        Given a meeting summary extract all the tasks according to the response schema specified:
    
        `;
  }

  async generateItems<T>(
    content: string | undefined,
    schema: ZodSchema<T>,
    customPrompt?: string,
  ): Promise<T> {
    const prompt = customPrompt ?? this.basePrompt;
    const response = await this.ai.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt + content }],
      response_format: zodResponseFormat(schema, 'result'),
    });

    const parsed = response.choices[0].message.parsed;
    return schema.parse(parsed);
  }
}
