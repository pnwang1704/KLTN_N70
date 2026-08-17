import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RecipeItem } from './recipe-item.entity';

@Entity()
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column({ nullable: true })
  size: string;

  @OneToMany(() => RecipeItem, recipeItem => recipeItem.recipe, { cascade: true })
  items: RecipeItem[];
}
