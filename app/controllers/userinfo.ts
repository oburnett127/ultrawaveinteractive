import { controller, httpDelete, httpGet, httpPost, httpPut, interfaces, request, requestParam, response } from 'inversify-express-utils';
import { inject, injectable } from 'inversify';
import * as express from 'express';
import localPassport from '../../passportext.js';
import jwt, { Secret } from 'jsonwebtoken';
import { UserinfoPayload, LoginPayload, UserinfoService } from '../services/userinfo.js';
import { TYPES } from '../services/types.js';
//import logger from '../config/logger.js';
import { RefreshToken } from '../models/refreshtoken.model.js';
import { serialize } from 'cookie';

const generateAccessToken = (userId: number) => {
  if(!userId) {
    throw new Error('userId is undefined');
  }
  
  if (!process.env.ACCESS_TOKEN_SECRET || typeof process.env.ACCESS_TOKEN_SECRET !== 'string') {
    throw new Error('Invalid or missing ACCESS_TOKEN_SECRET');
  }

  return jwt.sign({sub: userId}, process.env.ACCESS_TOKEN_SECRET as Secret, { expiresIn: '15m' });
};

const generateRefreshToken = async (userId: number) => {
  if(!userId) {
    throw new Error('userId is undefined');
  }

  const refreshToken = jwt.sign({sub: userId}, process.env.REFRESH_TOKEN_SECRET as Secret, { expiresIn: '7d' });
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);

  await RefreshToken.create({
    token: refreshToken,
    userId: userId,
    expiryDate: expiryDate,
  });

  return refreshToken;
};

@controller('/userinfo')
export class UserinfoController implements interfaces.Controller {
  private userinfoService: UserinfoService;
  
  constructor(
    @inject(TYPES.UserinfoService) userinfoService: UserinfoService
  ) {
    this.userinfoService = userinfoService;
  }

  [key: string]: any;

  @httpPost('/login')
  private async login(@request() req: express.Request, @response() res: express.Response): Promise<void> {
    try {
      const providedInfo: UserinfoPayload = req.body;
      const loginInfo: LoginPayload = {id: 1, email: providedInfo.email, password: providedInfo.password}

      if (!loginInfo) {
        res.sendStatus(400);
        return;
      }
      
      const userInfo = await this.userinfoService.getUserByEmail(loginInfo.email);
      const userAuthorized = await this.userinfoService.login(loginInfo);

      //logger.info('userAuthorized is: ' + userAuthorized);
  
      if (!userAuthorized || !userInfo) {
        res.sendStatus(401);
        return;
      }
  
      if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
        //logger.error("JWT secret is undefined");
        res.sendStatus(500);
        return;
      }
  
      //const user = { id: userInfo.id, email: userInfo.email, password: userInfo.password, 
      //                firstName: userInfo.firstName, lastName: userInfo.lastName }
      const accessToken = generateAccessToken(userInfo.id);
      const refreshToken = await generateRefreshToken(userInfo.id);

      const cookieOptions = {
        httpOnly: true, 
        secure: true,
        maxAge: 7 * 24 * 60 * 60,
        path: '/refresh-token',
      };

      const refreshTokenCookie = serialize('refreshToken', refreshToken, cookieOptions);

      res.setHeader('Set-Cookie', refreshTokenCookie);

      res.status(200).json({ accessToken });
    } catch (error) {
      //logger.error("Login error:", error);
      res.sendStatus(500);
    }
  }
  
  @httpPost('/signup')
  private async createUserinfo(@request() req: express.Request, @response() res: express.Response): Promise<void> {
    const userinfo: UserinfoPayload = req.body;

    if (!userinfo) {
      res.sendStatus(400);
    }

    const response = await this.userinfoService.getUserByEmail(userinfo.email);
    
    if (response) {
      res.sendStatus(409);
    } else {
      const createUserinfo = await this.userinfoService.create(userinfo);
      
      if (createUserinfo) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }  
    }
  }

  @httpPost('/token')
  private async getAccessToken(@request() req: express.Request, @response() res: express.Response): Promise<void> {
    const { refreshToken, userId } = req.body;

    if (!refreshToken) {
      res.sendStatus(401);
      return;
    }
    
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as Secret, (err: any) => {
      if (err) {
        res.sendStatus(403);
        return;
      }

      const newAccessToken = generateAccessToken(userId);

      res.json({ accessToken: newAccessToken });
    });
  }

  @httpGet('/getuserbyuserid/:userId', localPassport.authenticate('jwt', { session: false}))
  private async getUserByUserId(@requestParam('userId') userId: string, @response() res: express.Response): Promise<void> {
    if (!userId) {
      res.sendStatus(400);
    }

    const response = await this.userinfoService.getUserByUserId(userId);
    if (response) {
      res.status(200);
      res.send(response);
    } else {
      res.sendStatus(400);
    }
  }

  @httpGet('/getuserbyemail/:email', localPassport.authenticate('jwt', { session: false}))
  private async getUserByEmail(@requestParam('email') email: string, @response() res: express.Response): Promise<void> {
    if (!email) {
      res.sendStatus(400);
    }

    const response = await this.userinfoService.getUserByEmail(email);
    if (response) {
      res.status(200);
      res.send(response);
    } else {
      res.sendStatus(400);
    }
  }

  @httpGet('/getrolebyuserid/:userId', localPassport.authenticate('jwt', { session: false}))
  private async getRoleByUserId(@requestParam('userId') userId: string, @response() res: express.Response): Promise<void> {
    if (!userId) {
      res.sendStatus(400);
    }

    const response = await this.userinfoService.getRoleByUserId(userId);
    if (response) {
      res.status(200);
      res.send(response);
    } else {
      res.sendStatus(400);
    }
  }

  @httpGet('/getusersbyname/:name', localPassport.authenticate('jwt', { session: false}))
  private async getUsersByName(@requestParam('name') name: string, @response() res: express.Response): Promise<void> {
    if (!name) {
      res.sendStatus(400);
    }

    const response = await this.userinfoService.getUsersByName(name);
    if (response) {
      res.status(200);
      res.send(response);
    } else {
      res.sendStatus(400);
    }
  }

  @httpPut('/update/:id', localPassport.authenticate('jwt', { session: false}))
  private async update(@requestParam('id') id: string, @request() req: express.Request, @response() res: express.Response): Promise<void> {
    const userinfo: UserinfoPayload = req.body; 
    if (!userinfo || !id) {
      res.sendStatus(400);
    }

    const response = await this.userinfoService.update(userinfo, id);
    if (response) {
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  }

  @httpDelete('/deleteUserinfo/:id', localPassport.authenticate('jwt', { session: false}))
  private async deleteUserinfo(@requestParam('id') id: string, @response() res: express.Response): Promise<void> {
    if (!id) {
      res.sendStatus(400);
    }

    const response = await this.userinfoService.deleteUserinfo(id);
    if (response) {
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  }

  @httpDelete('/deleteAll', localPassport.authenticate('jwt', { session: false}))
  private async deleteAll(@request() req: express.Request, @response() res: express.Response): Promise<void> {
    const response = await this.userinfoService.deleteAll();
    if (response) {
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  }

}
