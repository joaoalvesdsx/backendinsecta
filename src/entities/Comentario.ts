import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { IsNotEmpty, IsString, Length } from "class-validator";
import { Colaboracao } from "./Colaboracao";
import { User } from "./User";

@Entity()
export class Comentario {
  @PrimaryGeneratedColumn({ type: "int" })
  comentario_id!: number;

  @ManyToOne(() => Colaboracao, (colaboracao) => colaboracao.comentarios, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "colaboracao_id" }) // Define a chave estrangeira no banco de dados
  colaboracao!: Colaboracao;

  @Column({ type: "varchar", length: 255, nullable: true })
  @IsString()
  @Length(1, 255)
  assunto?: string;

  // Mapeia a coluna física 'comentario' para a propriedade 'conteudo'
  @Column({ name: "comentario", type: "text" })
  @IsString()
  @IsNotEmpty()
  conteudo!: string;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @ManyToOne(() => User, (user) => user.comentarios, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "user_id" })
  autor?: User | null;
}
