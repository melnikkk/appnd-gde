import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recording } from './recording.entity';

@Entity('recording_events')
export class RecordingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  data: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;

  @Column()
  type: string;

  @ManyToOne(() => Recording, (recording) => recording.events)
  recording: Recording;
}
