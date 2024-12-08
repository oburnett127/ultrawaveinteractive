import { Model, Table, Column, PrimaryKey, ForeignKey, DataType, AutoIncrement, AllowNull, BelongsTo } from 'sequelize-typescript';
import { Userinfo } from './userinfo.model.js';

@Table
export class RefreshToken extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
        allowNull: false,
    })
    declare id: number;
   
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    private token!: string;

    @ForeignKey(() => Userinfo)
    @Column({
        type: DataType.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
         model: Userinfo,
         key: 'id'
        },
    })
    private userId!: number;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    private expiryDate!: Date;
}
