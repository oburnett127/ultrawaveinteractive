interface DbConfig {
  sync(): unknown;
  HOST: string;
  USER: string;
  PASSWORD: string;
  DB: string;
  dialect: string;
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

if (!process.env.DB_USERNAME || !process.env.DB_PASSWORD) {
  throw new Error("Required DB environment variables are not set.");
}

const dbConfig: DbConfig = {
  HOST: "localhost",
  USER: process.env.DB_USERNAME,
  PASSWORD: process.env.DB_PASSWORD,
  DB: "socialmediajs",
  dialect: "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  sync: function (): unknown {
    throw new Error("Function not implemented.");
  }
};

export default dbConfig;
