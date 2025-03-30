import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';
import { LocalStorageService } from './storage/local-storage.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

@Injectable()
export class RecordingsService {
  constructor(
    @InjectRepository(Recording)
    private recordingsRepository: Repository<Recording>,
    private storageService: LocalStorageService,
  ) {}

  async create(file: Express.Multer.File): Promise<Recording> {
    const fileKey = await this.storageService.saveFile(file);
    const recording = this.recordingsRepository.create({
      id: uuidv4(),
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
