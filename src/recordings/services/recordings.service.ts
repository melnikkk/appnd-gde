import * as fs from 'fs';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';
import { LocalStorageService } from './storage/local-storage.service';

@Injectable()
export class RecordingsService {
  constructor(
    @InjectRepository(Recording)
    private recordingsRepository: Repository<Recording>,
    private storageService: LocalStorageService,
  ) {}

  async create(file: Express.Multer.File, id: string): Promise<Recording> {
    const fileKey = await this.storageService.saveFile(file, id);
    const recording = this.recordingsRepository.create({
      id,
      name: file.originalname,
      s3Key: fileKey,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return this.recordingsRepository.save(recording);
  }

  async findAll(): Promise<Array<Recording>> {
    return this.recordingsRepository.find();
  }

  async findOne(id: string): Promise<Recording | null> {
    return this.recordingsRepository.findOneBy({ id });
  }

  async getSignedUrl(id: string): Promise<string> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new Error('Recording not found');
    }

    return this.storageService.getFilePath(recording.s3Key);
  }

  async remove(id: string): Promise<void> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${id} not found`);
    }

    const filePath = this.getFilePath(recording.s3Key);
    const isRecordingSourceExists = fs.existsSync(filePath);

    try {
      if (isRecordingSourceExists) {
        await this.storageService.deleteFile(recording.s3Key);
      }

      await this.recordingsRepository.remove(recording);
    } catch {
      throw new InternalServerErrorException('Failed to delete recording');
    }
  }

  getFilePath(key: string): string {
    return this.storageService.getFilePath(key);
  }
}
