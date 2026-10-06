import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('branches')
export class BranchController {
  @Public()
  @Get()
  getBranches() {
    return [
      {
        id: '1',
        name: 'Chi nhánh 1 (Trung Tâm)',
        address: '12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP.HCM',
        phone: '0901234567',
        isActive: true,
      },
    ];
  }
}
