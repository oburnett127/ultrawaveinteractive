import { Sequelize } from "sequelize-typescript";
import dbConfig from "../config/db.config.js";

const sequelize = new Sequelize({
  database: dbConfig.DB,
  username: dbConfig.USER,
  password: dbConfig.PASSWORD,
  host: dbConfig.HOST,
  dialect: 'mysql'
});

export default sequelize;
