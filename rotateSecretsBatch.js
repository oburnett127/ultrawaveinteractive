const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const crypto = require('crypto');

const client = new SecretManagerServiceClient();

// Function to generate a secure random string
function generateRandomSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Batch rotate secrets
export const rotateSecretsBatch = async (req, res) => {
  const projectId = 'ultrawaveinteractiveauth';
  const secretNames = req.body.secretNames; // Accept an array of secret names

  if (!Array.isArray(secretNames) || secretNames.length === 0) {
    res.status(400).send('Error: secretNames parameter must be a non-empty array.');
    return;
  }

  try {
    const results = [];
    for (const secretName of secretNames) {
      const newSecretValue = generateRandomSecret();

      await client.addSecretVersion({
        parent: `projects/${projectId}/secrets/${secretName}`,
        payload: {
          data: Buffer.from(newSecretValue, 'utf8'),
        },
      });

      results.push(`Secret rotated successfully: ${secretName}`);
    }

    //console.log('Secrets rotated successfully:', results);
    res.status(200).send(results);
  } catch (error) {
    console.error('Error rotating secrets:', error);
    res.status(500).send('Failed to rotate some or all secrets.');
  }
};
