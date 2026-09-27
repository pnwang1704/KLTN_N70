import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  branchId: string;

  @Column({ unique: true })
  employeeCode: string;

  @Column()
  fullName: string;

  @Column({ default: 'WAITER' })
  role: string; // 'CASHIER' | 'BARISTA' | 'WAITER' | 'MANAGER'

  @Column({ default: '1234' })
  pinCode: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  faceDescriptor?: number[] | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
