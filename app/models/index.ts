import { Sequelize } from "sequelize-typescript";
import dbConfig from "../config/db.config.js";
import { RefreshToken } from "./refreshtoken.model.js"
import { Userinfo } from "./userinfo.model.js";

const sequelize = new Sequelize({
  database: dbConfig.DB,
  username: dbConfig.USER,
  password: dbConfig.PASSWORD,
  host: dbConfig.HOST,
  dialect: 'mysql',
  logging: console.log,
  models: [Userinfo, RefreshToken],
});

export default sequelize;
