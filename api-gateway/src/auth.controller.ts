import { Controller, Post, Body, Get, Patch, Param, Query, Inject, ForbiddenException, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LoginDto, CreateUserDto, ToggleUserStatusDto } from './dto/auth.dto';
import { Public } from './common/decorators/public.decorator';
import { Roles } from './common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authClient.send('auth_login', loginDto);
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('users')
  createUser(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    const user = req.user;
    
    if (user.role === 'MANAGER') {
      createUserDto.branchId = user.branchId;
      if (createUserDto.role === 'ADMIN' || createUserDto.role === 'MANAGER') {
        throw new ForbiddenException('Managers cannot create ADMIN or MANAGER roles');
      }
    }

    return this.authClient.send('create_user', createUserDto);
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('users')
  getUsers(@Query('branchId') branchId: string, @Req() req: any) {
    const user = req.user;
    const targetBranchId = user.role === 'MANAGER' ? user.branchId : branchId;
    return this.authClient.send('get_users', targetBranchId || '');
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch('users/:id/status')
  toggleUserStatus(@Param('id') id: string, @Body() dto: ToggleUserStatusDto) {
    return this.authClient.send('toggle_user_status', { userId: id, isActive: dto.isActive });
  }
}
