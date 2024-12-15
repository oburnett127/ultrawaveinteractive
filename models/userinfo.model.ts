import { Model, Table, Column, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table
export class Userinfo extends Model {

  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
  })
  declare id: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  private firstName!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  private lastName!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  private email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  })
  private password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  private roles!: string;

}
