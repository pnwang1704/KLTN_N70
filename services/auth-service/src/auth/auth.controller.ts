import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto, ToggleUserStatusDto } from './dto/auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth_login')
  login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern('create_user')
  createUser(@Payload() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  @MessagePattern('validate_token')
  validateToken(@Payload() token: string) {
    return this.authService.validateToken(token);
  }

  @MessagePattern('get_users')
  getUsers(@Payload() branchId?: string) {
    return this.authService.getUsers(branchId);
  }

  @MessagePattern('toggle_user_status')
  toggleUserStatus(@Payload() dto: ToggleUserStatusDto) {
    return this.authService.toggleUserStatus(dto);
  }
}
