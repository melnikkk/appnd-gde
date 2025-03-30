import { Entity, PrimaryColumn, Column } from 'typeorm';

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

  // @Column('int')
  // duration: number;
}
