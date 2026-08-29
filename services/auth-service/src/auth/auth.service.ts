import { Injectable, UnauthorizedException, Logger, OnModuleInit, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RpcException } from '@nestjs/microservices';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, LoginDto, ToggleUserStatusDto } from './dto/auth.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const adminExists = await this.userRepository.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      this.logger.log('Seeding default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = this.userRepository.create({
        username: 'admin',
        password: hashedPassword,
        fullName: 'Super Admin',
        role: UserRole.ADMIN,
      });
      await this.userRepository.save(admin);
      this.logger.log('Default admin seeded successfully (admin / admin123).');
    }
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { password, username, ...rest } = createUserDto;
    
    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      throw new RpcException({ statusCode: 400, message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      ...rest,
    });
    
    const savedUser = await this.userRepository.save(user);
    delete (savedUser as any).password;
    return savedUser;
  }

  async getUsers(branchId?: string) {
    const query = this.userRepository.createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.fullName', 'user.role', 'user.branchId', 'user.isActive', 'user.createdAt']);
    
    if (branchId) {
      query.where('user.branchId = :branchId', { branchId });
    }
    
    query.orderBy('user.createdAt', 'DESC');
    return query.getMany();
  }

  async toggleUserStatus(dto: ToggleUserStatusDto) {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'User not found' });
    }
    
    user.isActive = dto.isActive;
    const savedUser = await this.userRepository.save(user);
    delete (savedUser as any).password;
    return savedUser;
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { username: loginDto.username } });
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or inactive user');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: user.role, 
      branchId: user.branchId 
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId
      }
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
