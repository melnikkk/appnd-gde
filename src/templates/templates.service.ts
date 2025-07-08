import { Injectable } from '@nestjs/common';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class TemplatesService {
  private readonly templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'src', 'templates', 'views');

    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  render(templateName: string, data: Record<string, unknown>): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.ejs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName}.ejs not found`);
    }

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf8');

      return ejs.render(templateContent, data);
    } catch (error) {
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }
}
