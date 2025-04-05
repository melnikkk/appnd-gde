import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'recordings');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, id: string): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${id}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return path.join('uploads', 'recordings', fileName);
  }

  getFilePath(key: string): string {
    return path.join(process.cwd(), key);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
