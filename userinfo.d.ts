declare module 'UserinfoModule' {
  export class Userinfo {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      roles: string;

      constructor(id: number, firstName: string, lastName: string, email: string, password: string, roles: string);

      static findByPk(pk: number | string): Promise<Userinfo | null>;
  }
}
