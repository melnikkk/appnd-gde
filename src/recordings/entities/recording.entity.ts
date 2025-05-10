import { Entity, PrimaryColumn, Column } from 'typeorm';
import { RecordingEventsRecord } from './recording-events.types';

@Entity()
export class Recording {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  s3Key: string;

  @Column()
  mimeType: string;

  @Column('int')
  fileSize: number;

  @Column({ type: 'varchar', nullable: true })
  thumbnailPath: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column('bigint')
  duration: number;

  @Column('bigint')
  startTime: number;

  @Column('bigint', { nullable: true })
  stopTime: number | null;

  @Column('jsonb', { nullable: true, default: {} })
  events: RecordingEventsRecord;
}
