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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => RecordingEvent, (event) => event.recording)
  events: Array<RecordingEvent>;
}
