import { Module } from '@nestjs/common';
import { LocalStorageService } from './services/local-storage.service';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageService,
    },
    LocalStorageService,
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}