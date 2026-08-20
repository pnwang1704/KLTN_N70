import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LoginDto } from './dto/auth.dto';
import { Public } from './common/decorators/public.decorator';

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
}
