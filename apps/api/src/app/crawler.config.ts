// apps/api/src/crawler.config.ts
import { Injectable } from '@nestjs/common';
import { DbService, Config } from './db/db.service';

interface BrowserConfig {
  headless: boolean;
  args: string[];
  defaultViewport: { width: number; height: number };
  executablePath?: string;
}

interface Timeouts {
  navigation: number;
  waitForSelector: number;
  cookieBanner: number;
}

type BrowserType = 'chrome' | 'firefox' | 'brave';
type CookieStrategy = 'accept' | 'reject' | 'optional';

type CookieBannerSelectors = Record<CookieStrategy, string[]>;

export interface CrawlerConfig {
  browser: BrowserType;
  browserConfig: BrowserConfig;
  timeouts: Timeouts;
  cookieBannerSelectors: CookieBannerSelectors;
  cookieStrategy: CookieStrategy;
  jsEnabled: boolean;
}

@Injectable()
export class CrawlerConfigService {
  private BROWSER_CONFIGS: Record<BrowserType, BrowserConfig>;
  private TIMEOUTS: Timeouts;
  private COOKIE_BANNER_SELECTORS: CookieBannerSelectors;

  constructor(private readonly dbService: DbService) {
    this.BROWSER_CONFIGS = {
      chrome: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      },

      firefox: {
        executablePath: '/usr/bin/firefox',
        headless: true,
        args: ['--width=1920', '--height=1080'],
        defaultViewport: { width: 1920, height: 1080 },
      },

      brave: {
        executablePath: this._getBraveExecutablePath(),
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      },
    };

    this.TIMEOUTS = {
      navigation: 30000,
      waitForSelector: 10000,
      cookieBanner: 5000,
    };

    this.COOKIE_BANNER_SELECTORS = {
      accept: [
        '[data-testid="banner-accept-all-button"]',
        '.scmp-sdk-banner__buttons__accept-button',
        '#onetrust-accept-btn-handler',
        '.cookie-consent-accept',
        'button[id*="accept" i]',
        'button[class*="accept" i]',
        '[aria-label*="accept" i]',
      ],

      reject: [
        '[data-testid="banner-reject-all-button"]',
        '.scmp-sdk-banner__buttons__reject-button',
        '#onetrust-reject-all-handler',
        '.cookie-consent-reject',
        'button[id*="reject" i]',
        'button[class*="reject" i]',
        'button[id*="decline" i]',
        'button[class*="decline" i]',
        '[aria-label*="reject" i]',
      ],

      optional: [
        '[data-testid="banner-customize-button"]',
        '.scmp-sdk-banner__buttons__customize-button',
        '#onetrust-pc-btn-handler',
        '.cookie-settings',
        '.cookie-preferences',
        'button[id*="settings" i]',
        'button[class*="settings" i]',
        'button[id*="custom" i]',
        'button[class*="custom" i]',
        '[aria-label*="settings" i]',
      ],
    };
  }

  /**
   * Récupère la config depuis la DB et la transforme en CrawlerConfig
   */
  async getConfigFromDatabase(configId: number): Promise<CrawlerConfig> {
    const dbConfig = await this.dbService.getConfigById(configId);

    if (!dbConfig) {
      throw new Error(`Config with ID ${configId} not found in database`);
    }

    return this._mapDbConfigToCrawlerConfig(dbConfig);
  }

  /**
   * Transforme un Config (DB) -> CrawlerConfig (utilisé par le crawler)
   */
  private _mapDbConfigToCrawlerConfig(dbConfig: Config): CrawlerConfig {
    const browserType: BrowserType = dbConfig.browser;

    const baseBrowserConfig = this.BROWSER_CONFIGS[browserType];
    if (!baseBrowserConfig) {
      throw new Error(`Unknown browser in DB: ${browserType}`);
    }

    const finalBrowserConfig: BrowserConfig = { ...baseBrowserConfig };
    const cookieStrategy: CookieStrategy = this._mapDbCookieStrategy(dbConfig.cookies);
    const jsEnabled = dbConfig.js;

    return {
      browser: browserType,
      browserConfig: finalBrowserConfig,
      timeouts: this.TIMEOUTS,
      cookieBannerSelectors: this.COOKIE_BANNER_SELECTORS,
      cookieStrategy,
      jsEnabled,
    };
  }

  /**
   * DB Cookie-Wert → Cookie-Strategie
   * 'yes' | 'no' | 'opt' → 'accept' | 'reject' | 'optional'
   */
  private _mapDbCookieStrategy(dbCookies: 'yes' | 'no' | 'opt'): CookieStrategy {
    switch (dbCookies) {
      case 'yes':
        return 'accept';
      case 'no':
        return 'reject';
      case 'opt':
        return 'optional';
      default:
        throw new Error(`Unknown cookie strategy in DB: ${dbCookies}`);
    }
  }

  private _getBraveExecutablePath(): string {
    const platform = process.platform;
    if (platform === 'win32') {
      return 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
    }
    if (platform === 'linux') {
      return '/usr/bin/brave-browser';
    }
    return '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
  }
}