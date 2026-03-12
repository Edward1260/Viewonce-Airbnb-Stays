import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async findAll(@Request() req) {
    return this.wishlistService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.wishlistService.findOne(id, req.user.id);
  }

  @Post()
  async add(@Body() createWishlistDto: CreateWishlistDto, @Request() req) {
    return this.wishlistService.add(req.user.id, createWishlistDto.propertyId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.wishlistService.remove(id, req.user.id);
  }

  @Get('check/:propertyId')
  async check(@Param('propertyId') propertyId: string, @Request() req) {
    const isInWishlist = await this.wishlistService.checkIsInWishlist(
      req.user.id,
      propertyId,
    );
    return { isInWishlist };
  }
}
