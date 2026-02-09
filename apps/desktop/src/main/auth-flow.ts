import { shell } from 'electron';
import http from 'http';
import { TokenStore } from '@insight/core';
import { getAuthUrl, exchangeCodeForToken, fetchUserProfile } from '@insight/api';
import { UserProfile } from '@insight/shared';
import { log } from './fs-utils';

let server: http.Server | null = null;

export class AuthManager {
  private tokenStore: TokenStore;
  private isFakeMode: boolean;

  constructor(userDataPath: string, isFakeMode: boolean) {
    this.tokenStore = new TokenStore(userDataPath);
    this.isFakeMode = isFakeMode;
  }

  async connect(): Promise<UserProfile> {
    if (this.isFakeMode) {
      log('[Auth] Fake mode: Returning mock profile');
      await new Promise(r => setTimeout(r, 1000));
      const mockUser = {
        id: 'fake_123',
        name: 'Test User (Fake)',
        email: 'test@example.com',
        picture: 'https://picsum.photos/100/100'
      };
      // Save dummy tokens to persist "login" state in fake mode
      this.tokenStore.saveTokens({
        access_token: 'fake_token',
        refresh_token: 'fake_refresh',
        expiry_date: Date.now() + 3600000,
        scope: 'all'
      });
      return mockUser;
    }

    return new Promise((resolve, reject) => {
      if (server) server.close();

      server = http.createServer(async (req, res) => {
        if (!req.url) return;
        const url = new URL(req.url, 'http://localhost:54321');
        const code = url.searchParams.get('code');

        if (code) {
          res.end('<h1>Login Successful</h1><p>You can close this window and return to InsightEngine.</p><script>window.close()</script>');
          if (server) {
            server.close();
            server = null;
          }

          try {
            log('[Auth] Code received, exchanging for tokens...');
            const tokens = await exchangeCodeForToken(code);
            this.tokenStore.saveTokens(tokens);
            
            log('[Auth] Tokens saved, fetching profile...');
            const profile = await fetchUserProfile(tokens.access_token);
            resolve(profile);
          } catch (error) {
            log(`[Auth] Error: ${error}`);
            reject(error);
          }
        }
      });

      server.listen(54321, () => {
        log('[Auth] Local server listening on 54321');
        const authUrl = getAuthUrl();
        shell.openExternal(authUrl);
      });

      server.on('error', (err) => {
        reject(err);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.tokenStore.clearTokens();
    log('[Auth] Disconnected, tokens cleared.');
  }

  async getProfile(): Promise<UserProfile | null> {
    const tokens = this.tokenStore.getTokens();
    if (!tokens) return null;

    if (this.isFakeMode) {
      return {
        id: 'fake_123',
        name: 'Test User (Fake)',
        email: 'test@example.com',
        picture: 'https://picsum.photos/100/100'
      };
    }

    try {
      // In a real app, check expiry and refresh if needed here
      return await fetchUserProfile(tokens.access_token);
    } catch (error) {
      log(`[Auth] Failed to fetch profile with stored token: ${error}`);
      return null;
    }
  }
}
