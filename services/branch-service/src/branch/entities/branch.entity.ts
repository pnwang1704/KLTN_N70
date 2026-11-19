import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BranchTable } from './branch-table.entity';

@Entity('branches')
export class Branch {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  code: string; // CN01, CN02...

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: '07:00' })
  openTime: string;

  @Column({ default: '22:00' })
  closeTime: string;

  @Column({ nullable: true })
  wifiName: string;

  @Column({ nullable: true })
  wifiPassword: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => BranchTable, (table) => table.branch, { cascade: true })
  tables: BranchTable[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
