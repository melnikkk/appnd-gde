import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as process from 'node:process';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.USER_NAME,
      password: process.env.PASSWORD,
      database: 'gde_records',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      //TODO: disable in production
      synchronize: true,
      logging: true,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
