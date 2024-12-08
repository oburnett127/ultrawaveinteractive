import { injectable } from 'inversify';
import { Userinfo } from '../models/userinfo.model.js';
import logger from '../config/logger.js';
import { RefreshToken } from '../models/refreshtoken.model.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

export interface UserinfoPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string;
}

export interface LoginPayload {
  id: number;
  email: string;
  password: string;
}

interface RefreshTokenPayload {
  token: string;
  userId: number;
  expiryDate: Date;
}

interface RefreshTokenCreationAttributes {
  token: string;
  userId: number;
  expiryDate: Date;
}

@injectable()
export class UserinfoService {

  public async login(loginInfo: LoginPayload): Promise<boolean> {
    try {
      const userinfo = await Userinfo.findOne({
        where: { email: loginInfo.email },
        attributes: ['password'],
      });
  
      if (!userinfo) {
        return false;
      }
  
      const receivedPlaintextPassword = loginInfo.password;
      const storedHashedPassword = userinfo.dataValues.password;
  
      if (!receivedPlaintextPassword || !storedHashedPassword) {
        return false;
      }
  
      const passwordMatch = await bcrypt.compare(receivedPlaintextPassword, storedHashedPassword);
      return passwordMatch;
    } catch (err: any) {
      logger.error(err.message);
      throw err;
    }
  }
  
  
  public async create(userinfo: UserinfoPayload): Promise<Userinfo | void> {
    try {
      const hashedPassword = await bcrypt.hash(userinfo.password, 10);
  
      userinfo.password = hashedPassword;
      userinfo.roles = "USER";
      const newUserinfo = await Userinfo.create(userinfo as any);
      return newUserinfo;
    } catch (err: any) {
      logger.error(err.message);
      throw err;
    }
  }
  

  public async saveRefreshToken(refreshTokenPayload: RefreshTokenPayload): Promise<void> {
    try {
        const payload: RefreshTokenCreationAttributes = {
            token: refreshTokenPayload.token,
            userId: refreshTokenPayload.userId,
            expiryDate: refreshTokenPayload.expiryDate
        };
        await RefreshToken.create(payload as any);
    } catch (error) {
        console.error("Error saving refresh token:", error);
        throw new Error("Could not save refresh token.");
    }
}

  public async getUserByUserId(id: string): Promise<Userinfo | void> {
    return Userinfo.findOne({
      where: { id: id },
      attributes: { exclude: ['password'] },
    })
      .then((data: any) => data)
      .catch((err: any) => {logger.error(err.message); throw err; });
  }

  public async getUserByEmail(email: string): Promise<Userinfo | void> {
    return Userinfo.findOne({
      where: { email: email },
      attributes: { exclude: ['password'] },
    })
    .then((data: any) => data)
    .catch((err: any) => {logger.error(err.message); throw err; });
  }

  public async update(userinfo: UserinfoPayload, id: string): Promise<void | number[]> {
   return Userinfo.update(userinfo, { where: { id: id } })
    .then((affectedCount: number[]) => affectedCount)
    .catch((err: any) => { logger.error(err.message); throw err; });
  }

  public async deleteUserinfo(id: string): Promise<void | number> {
    return Userinfo.destroy({ where: { id: id } })
      .then((num: number) => num)
      .catch((err: any) => { logger.error(err.message); throw err; });
  }

  public async deleteAll(): Promise<void | number> {
    return Userinfo.destroy({
      where: {},
      truncate: false
    })
      .then((nums: any) => nums)
      .catch((err: { message: any; }) => { logger.error(err.message); throw err; });
  }

  public async getUsersByName(name: string): Promise<Userinfo[] | null> {
      const nameParts = name.split(' ');

      try {
          if (nameParts.length === 2) {
              const [firstName, lastName] = nameParts;

              // Find users by full name (first and last name)
              const users = await Userinfo.findAll({
                  where: {
                      firstName: firstName,
                      lastName: lastName,
                      attributes: { exclude: ['password'] },
                  }
              }) as Userinfo[];
              
              const reverseOrderUsers = await Userinfo.findAll({
                  where: {
                    lastName: firstName,
                    firstName: lastName,
                    attributes: { exclude: ['password'] },
                  }
              }) as Userinfo[];

              const combinedUsers = [...users, ...reverseOrderUsers];

              return combinedUsers;
          } else if (nameParts.length === 1) {
              const providedName = nameParts[0];

              const matchingUsers = await Userinfo.findAll({
                  where: {
                      [Op.or]: [
                          { firstName: providedName },
                          { lastName: providedName }
                      ],
                      attributes: { exclude: ['password'] },
                  }
              }) as Userinfo[];

              return matchingUsers;
          }

          return null;

      } catch (error) {
          console.error('Error fetching users by name:', error);
          throw error;
      }
  }

  public async getRoleByUserId(userId: string): Promise<string> {
    try {
      const userinfo = await Userinfo.findOne({
        where: {  userId: userId,
          attributes: { exclude: ['password'] },
        }
      })
      if(!userinfo) return "";
      else {
        return userinfo.dataValues.roles;
      }
    } catch(err: any) {
      logger.error(err.message);
      throw err;
    }
  }
}
