import SecretManagerServiceClient from '@google-cloud/secret-manager';

class SecretManager {
  static instance;

  constructor(ttl = 3600 * 1000) {
    if (SecretManager.instance) {
      return SecretManager.instance;
    }

    this.client = new SecretManagerServiceClient();
    this.cache = {};
    this.ttl = ttl;

    SecretManager.instance = this;
  }

  static getInstance() {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  async initializeSecrets() {
    const requiredSecrets = [
      'EMAIL_USER',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REFRESH_TOKEN',
      'NEXTAUTH_SECRET',
      'RECAPTCHA_SECRET_KEY',
      'REDIS_URL',
      'SESSION_SECRET',
      'SQUARE_ACCESS_TOKEN',
    ];

    for (const secretName of requiredSecrets) {
      await this.refreshSecret(secretName);
    }
  }

  async getSecret(secretName) {
    const cachedSecret = this.cache[secretName];

    if (cachedSecret && Date.now() < cachedSecret.expiresAt) {
      return cachedSecret.value;
    }

    await this.refreshSecret(secretName);
    return this.cache[secretName].value;
  }

  async refreshSecret(secretName) {
    const [version] = await this.client.accessSecretVersion({
      name: `projects/ultrawaveinteractiveauth/secrets/${secretName}/versions/latest`,
    });

    const payload = version.payload?.data
      ? Buffer.from(version.payload.data).toString('utf8')
      : undefined;

    if (!payload) {
      throw new Error(`Secret ${secretName} could not be retrieved.`);
    }

    this.cache[secretName] = {
      value: payload,
      expiresAt: Date.now() + this.ttl,
    };
  }
}

export default SecretManager;

