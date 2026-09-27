import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column({ type: 'varchar' })
  branchId: string;

  @Column({ type: 'varchar', nullable: true })
  shiftId?: string | null;

  @Column({ type: 'varchar', default: 'CA_1' })
  shiftCode: string;

  @Column({ type: 'timestamptz' })
  checkInAt: Date;

  @Column({ type: 'text' })
  checkInPhoto: string;

  @Column({ type: 'timestamptz', nullable: true })
  checkOutAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  checkOutPhoto?: string | null;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
    transformer: {
      to: (val?: number | null) => val,
      from: (val?: string | number | null) => (val !== null && val !== undefined ? parseFloat(String(val)) : null),
    },
  })
  workingHours?: number | null;

  @Column({ default: 'ON_TIME' })
  status: string; // 'ON_TIME' | 'LATE' | 'EARLY_LEAVE'

  @Column({ type: 'boolean', default: true })
  isFaceVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
