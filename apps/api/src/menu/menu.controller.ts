import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateMenuItemOptionDto } from './dto/create-menu-item-option.dto';
import { UpdateMenuItemOptionDto } from './dto/update-menu-item-option.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.menuService.findAll(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateMenuItemDto) {
    return this.menuService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.menuService.remove(id);
  }

  @Get(':id/options')
  @Roles('ADMIN')
  findOptions(@Param('id') id: string) {
    return this.menuService.findOptionsByItem(id);
  }

  @Post(':id/options')
  @Roles('ADMIN')
  createOption(@Param('id') id: string, @Body() dto: CreateMenuItemOptionDto) {
    return this.menuService.createOption(id, dto);
  }

  @Put('options/:optionId')
  @Roles('ADMIN')
  updateOption(
    @Param('optionId') optionId: string,
    @Body() dto: UpdateMenuItemOptionDto,
  ) {
    return this.menuService.updateOption(optionId, dto);
  }

  @Delete('options/:optionId')
  @Roles('ADMIN')
  removeOption(@Param('optionId') optionId: string) {
    return this.menuService.removeOption(optionId);
  }

  @Post('upload-image')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(
            __dirname,
            '..',
            '..',
            '..',
            'uploads',
            'menu',
          );
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { url: null };
    }
    const relativePath = `/uploads/menu/${file.filename}`;
    const base = process.env.PUBLIC_API_BASE_URL || '';
    const url = base ? `${base}${relativePath}` : relativePath;
    return { url, path: relativePath };
  }
}
