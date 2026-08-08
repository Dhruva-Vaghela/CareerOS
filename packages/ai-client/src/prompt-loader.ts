import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationError } from '@careeros/errors';

const DEFAULT_PROMPTS_DIRECTORY = fileURLToPath(new URL('../prompts', import.meta.url));

export class PromptLoader {
  constructor(private readonly promptsDirectory: string = DEFAULT_PROMPTS_DIRECTORY) {}

  public async load(templateFile: string): Promise<string> {
    const resolvedPath = resolve(this.promptsDirectory, templateFile);
    if (relative(this.promptsDirectory, resolvedPath).startsWith('..')) {
      throw new ValidationError('Prompt template path must remain inside the prompts directory.');
    }
    return readFile(resolvedPath, 'utf8');
  }
}
