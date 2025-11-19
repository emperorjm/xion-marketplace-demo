import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const clientDistPath = join(__dirname, '..', 'client', 'dist');
const staticModules = existsSync(clientDistPath)
  ? [
      ServeStaticModule.forRoot({
        rootPath: clientDistPath,
        exclude: ['/api*'],
      }),
    ]
  : [];

@Module({
  imports: [...staticModules],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
