import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import {
  IsString,
  IsOptional,
  IsEmail,
  Length,
  IsNumber,
  IsNotEmpty,
  IsIn,
} from "class-validator";
import { Colaboracao } from "./Colaboracao";
import { Comentario } from "./Comentario";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  user_id?: number;

  @Column({ type: "varchar", length: 50, default: "Comum" })
  @IsString()
  @IsOptional()
  @IsIn(["Comum", "Colaborador", "Admin"])
  @Length(1, 50)
  tipo?: string;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  nome_completo!: string;

  @Column({ type: "bigint" })
  @IsNumber()
  telefone!: number;

  @Column({ type: "bigint", default: null })
  @IsNumber()
  @IsOptional()
  whatsapp?: number;

  @Column({ type: "varchar", length: 255, unique: true })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  @IsString()
  @IsOptional()
  @Length(1, 255)
  instituicao?: string;

  @Column({ type: "varchar", length: 255, default: "" })
  @IsString()
  @IsOptional()
  @Length(1, 255)
  curso?: string;

  @Column({ type: "varchar", length: 100, default: "" })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  nivel_academico?: string;

  @Column({ type: "varchar", length: 255, default: "" })
  @IsString()
  @IsOptional()
  @Length(1, 255)
  link_lattes?: string;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @IsNotEmpty()
  @Length(8, 255)
  senha!: string;

  @Column({ nullable: true })
  reset_token?: string;

  @Column({ nullable: true, type: "timestamp" })
  reset_token_expiration?: Date;

  @Column({ type: "boolean", default: false })
  ativo!: boolean;

  @Column({ nullable: true })
  email_verification_token!: string;

  @Column({ nullable: true })
  email_verification_expires!: Date;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  @OneToMany(() => Colaboracao, (colaboracao) => colaboracao.user)
  colaboracoes!: Colaboracao[];

  @OneToMany(() => Comentario, (comentario) => comentario.autor)
  comentarios!: Comentario[];
}
