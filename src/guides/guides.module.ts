import { Module } from '@nestjs/common';
import { GuideGeneratorService } from './services/guide-generator.service';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [TemplatesModule],
  providers: [GuideGeneratorService],
  exports: [GuideGeneratorService],
})
export class GuidesModule {}
