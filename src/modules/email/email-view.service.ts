import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';

/**
 * Renders email HTML from Handlebars templates under src/views/emails/.
 * Falls back to null if template is missing (caller can use inline HTML).
 */
@Injectable()
export class EmailViewService {
  private readonly viewsDir: string;

  constructor() {
    this.viewsDir = path.join(__dirname, '..', '..', 'views', 'emails');
  }

  render(templateName: string, data: Record<string, unknown>): string | null {
    const filePath = path.join(this.viewsDir, `${templateName}.hbs`);
    try {
      if (!fs.existsSync(filePath)) return null;
      const source = fs.readFileSync(filePath, 'utf-8');
      const template = Handlebars.compile(source);
      return template(data);
    } catch {
      return null;
    }
  }
}
