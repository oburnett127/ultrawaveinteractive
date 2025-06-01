if (!process.env.DB_USERNAME || !process.env.DB_PASSWORD) {
  throw new Error("Required DB environment variables are not set.");
}

const dbConfig = {
  HOST: process.env.DB_HOSTNAME || "database-host-name",
  USER: process.env.DB_USERNAME,
  PASSWORD: process.env.DB_PASSWORD,
  DB: process.env.DB_NAME || "database-name",
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
