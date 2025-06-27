import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Recording } from '../../recordings/entities/recording.entity';
import { RecordingEventType } from '../recording-event.constants';
import { RecordingEventData } from './recording-events.types';

@Entity('recording_events')
export class RecordingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  data: RecordingEventData;

  @Column({ type: 'bigint' })
  timestamp: number;

  @Column()
  type: RecordingEventType;

  @Column({ nullable: false, default: () => 'id' })
  title: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Recording, (recording) => recording.events)
  recording: Recording;
}
