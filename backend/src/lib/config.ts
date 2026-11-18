import 'dotenv/config';

// Central place for secrets. The server refuses to start without JWT_SECRET so
// a forgotten environment variable can never fall back to a guessable key.
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    'JWT_SECRET must be set to a random string of at least 32 characters. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

export const JWT_SECRET: string = secret;
