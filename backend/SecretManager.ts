import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

class SecretManager {
  private static instance: SecretManager;
  private client: SecretManagerServiceClient;
  private cache: { [key: string]: { value: string; expiresAt: number } } = {};
  private ttl: number; // Time-to-live for cached secrets in milliseconds

  private constructor(ttl: number = 3600 * 1000) { // Default TTL: 1 hour
    this.client = new SecretManagerServiceClient();
    this.ttl = ttl;
  }

  // Singleton instance getter
  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  // Initialize secrets at application startup
  public async initializeSecrets(): Promise<void> {
    const requiredSecrets = ['EMAIL_USER', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'NEXTAUTH_SECRET', 'RECAPTCHA_SECRET_KEY', 'REDIS_URL', 'SESSION_SECRET', 'SQUARE_ACCESS_TOKEN'];

    for (const secretName of requiredSecrets) {
      await this.refreshSecret(secretName);
    }

    console.log('Secrets initialized and cached in memory.');
  }

  // Get a secret, refreshing it if expired
  public async getSecret(secretName: string): Promise<string> {
    const cachedSecret = this.cache[secretName];

    if (cachedSecret && Date.now() < cachedSecret.expiresAt) {
      console.log(`Cache hit for secret: ${secretName}`);
      return cachedSecret.value;
    }

    console.log(`Cache miss or expired for secret: ${secretName}`);
    await this.refreshSecret(secretName);
    return this.cache[secretName].value;
  }

  // Refresh a secret from Google Secret Manager
  private async refreshSecret(secretName: string): Promise<void> {
    const [version] = await this.client.accessSecretVersion({
      name: `projects/ultrawaveinteractiveauth/secrets/${secretName}/versions/latest`,
    });

    const payload = version.payload?.data
      ? Buffer.from(version.payload.data).toString('utf8')
      : undefined;

    if (!payload) {
      throw new Error(`Secret ${secretName} could not be retrieved.`);
    }

    // Update the in-memory cache with a new TTL
    this.cache[secretName] = {
      value: payload,
      expiresAt: Date.now() + this.ttl, // Set expiration time
    };

    console.log(`Secret refreshed and cached: ${secretName}`);
  }
}

export default SecretManager;
