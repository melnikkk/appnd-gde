import { forwardRef, Module } from '@nestjs/common';
import { LocalStorageService } from './services/local-storage.service';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import { PathManagerService } from './services/path-manager.service';
import { MediaModule } from '../media/media.module';
import { PATH_MANAGER } from './interfaces/path-manager.interface.constants';

@Module({
  imports: [forwardRef(() => MediaModule)],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageService,
    },
    {
      provide: PATH_MANAGER,
      useClass: PathManagerService,
    },
    LocalStorageService,
    PathManagerService,
  ],
  exports: [STORAGE_PROVIDER, PathManagerService, PATH_MANAGER],
})
export class StorageModule {}
