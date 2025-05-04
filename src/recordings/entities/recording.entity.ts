import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { RecordingEvent } from './recording-event.entity';

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

  @Column('int')
  duration: number;

  @Column('bigint')
  startTime: number;

  @Column('bigint', { nullable: true })
  stopTime: number | null;

  @OneToMany(() => RecordingEvent, (event) => event.recording)
  events: Array<RecordingEvent>;
}
