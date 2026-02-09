import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string;
}

export class TokenStore {
  private storagePath: string;
  private keyPath: string;
  private algorithm = 'aes-256-gcm';

  constructor(userDataPath: string) {
    this.storagePath = path.join(userDataPath, 'tokens.enc');
    this.keyPath = path.join(userDataPath, 'master.key');
  }

  private getMasterKey(): Buffer {
    if (fs.existsSync(this.keyPath)) {
      return fs.readFileSync(this.keyPath);
    }
    // Generate a new random key if one doesn't exist
    const key = crypto.randomBytes(32);
    fs.writeFileSync(this.keyPath, key, { mode: 0o600 }); // Read/write only by owner
    return key;
  }

  saveTokens(tokens: TokenData): void {
    const key = this.getMasterKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const json = JSON.stringify(tokens);
    let encrypted = cipher.update(json, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const payload = JSON.stringify({
      iv: iv.toString('hex'),
      content: encrypted,
      tag: authTag
    });

    fs.writeFileSync(this.storagePath, payload, { encoding: 'utf8', mode: 0o600 });
  }

  getTokens(): TokenData | null {
    if (!fs.existsSync(this.storagePath)) return null;

    try {
      const raw = fs.readFileSync(this.storagePath, 'utf8');
      const { iv, content, tag } = JSON.parse(raw);
      const key = this.getMasterKey();

      const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(content, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return null;
    }
  }

  clearTokens(): void {
    if (fs.existsSync(this.storagePath)) {
      fs.unlinkSync(this.storagePath);
    }
  }
}
