import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  Length,
  IsLatitude,
  IsLongitude,
  IsIn,
} from "class-validator";
import { User } from "./User";
import { Imagem } from "./Imagem";
import { Comentario } from "./Comentario";

@Entity()
export class Colaboracao {
  @PrimaryGeneratedColumn({ type: "int" })
  colaboracao_id?: number;

  @Index("idx_colaboracoes_user_id")
  @ManyToOne(() => User, (user) => user.colaboracoes, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Index("idx_colaboracoes_nome_especie")
  @Column({ type: "varchar", length: 255 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  nome_especie!: string;

  @Index("idx_colaboracoes_data")
  @Column({ type: "datetime" })
  @IsDate()
  data!: Date;

  @Index("idx_colaboracoes_pais")
  @Column({ type: "varchar", length: 100 })
  @IsString()
  @Length(1, 100)
  pais!: string;

  @Index("idx_colaboracoes_regiao")
  @Column({ type: "varchar", length: 100 })
  @IsString()
  @Length(1, 100)
  regiao!: string;

  @Index("idx_colaboracoes_estado")
  @Column({ type: "varchar", length: 100 })
  @IsString()
  @Length(1, 100)
  estado!: string;

  @Column({ type: "varchar", length: 100 })
  @IsString()
  @Length(1, 100)
  municipio!: string;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @IsLatitude()
  latitude!: number;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @IsLongitude()
  longitude!: number;

  @Column({ type: "varchar" })
  @IsNumber()
  altitude!: number;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @Length(1, 255)
  coletor!: string;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @Length(1, 255)
  instituicao_coletor!: string;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @Length(1, 255)
  autor_foto!: string;

  @Column({ type: "varchar", length: 255 })
  @IsString()
  @Length(1, 255)
  instituicao_autor!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  @IsString()
  @Length(1, 100)
  SISBIO!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  @IsString()
  @Length(1, 100)
  SISGEN!: string;

  @Column({ type: "text", nullable: true })
  @IsString()
  observacoes?: string;

  @Index("idx_colaboracoes_status")
  @Column({ type: "varchar", length: 100, default: "Em analise" })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  @IsIn(["Em analise", "Aprovada", "Rejeitada", "Algo a corrigir"])
  status?: string;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  @OneToMany(() => Imagem, (imagem) => imagem.colaboracao)
  imagens!: Imagem[];

  @OneToMany(() => Comentario, (comentario) => comentario.colaboracao)
  comentarios!: Comentario[];
}
