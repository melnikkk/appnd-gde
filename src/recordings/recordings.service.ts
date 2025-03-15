import { Injectable } from '@nestjs/common';
import { Recording, Recordings } from './recordings.interface';

@Injectable()
export class RecordingsService {
  private readonly recordings: Recordings = {};

  create(recording: Recording) {
    this.recordings[recording.id] = recording;
  }

  findAll() {
    return this.recordings;
  }

  findOne(id: string) {
    return this.recordings[id];
  }

  remove(id: string) {
    delete this.recordings[id];

    console.log('Remove service called');

    return this.recordings;
  }
}
