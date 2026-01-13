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
}

export type CrawlerConfigOverrides = Partial<{
  browserConfigs: Partial<Record<BrowserType, Partial<BrowserConfig>>>;
  timeouts: Partial<Timeouts>;
  cookieBannerSelectors: Partial<Record<CookieStrategy, string[]>>;
}>;

export class CrawlerConfigService {
  private BROWSER_CONFIGS: Record<BrowserType, BrowserConfig>;
  private TIMEOUTS: Timeouts;
  private COOKIE_BANNER_SELECTORS: CookieBannerSelectors;

  constructor(overrides?: CrawlerConfigOverrides) {
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

    /**
     * WICHTIG:
     * - `button:contains("...")` funktioniert NICHT mit `page.waitForSelector()` (CSS).
     * - Nutze stabile Attribute (data-testid) + CSS-Fallbacks.
     * - Textmatching (Akzeptieren/Anpassen) macht man separat (evaluate/xpath),
     *   nicht als CSS-Selektor.
     */
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

    // if (overrides?.browserConfigs) {
    //   for (const key of Object.keys(overrides.browserConfigs) as BrowserType[]) {
    //     const base = this.BROWSER_CONFIGS[key];
    //     const ov = overrides.browserConfigs[key] ?? {};

    //     this.BROWSER_CONFIGS[key] = {
    //       ...base,
    //       ...ov,
    //       defaultViewport: {
    //         ...base.defaultViewport,
    //         ...(ov.defaultViewport ?? {}),
    //       },
    //       // args komplett ersetzen, wenn overrides args liefern
    //       args: ov.args ?? base.args,
    //     };
    //   }
    // }

    if (overrides?.timeouts) {
      this.TIMEOUTS = { ...this.TIMEOUTS, ...overrides.timeouts };
    }
    if (overrides?.cookieBannerSelectors) {
      this.COOKIE_BANNER_SELECTORS = {
        ...this.COOKIE_BANNER_SELECTORS,
        ...overrides.cookieBannerSelectors,
      };
    }
  }

  /**
   * Gibt komplette Config zurück
   */
  getConfig(browserType: BrowserType = 'chrome'): CrawlerConfig {
    const browserConfig = this.BROWSER_CONFIGS[browserType];
    if (!browserConfig) {
      throw new Error(`Unknown browserType: ${browserType}`);
    }

    return {
      browser: browserType,
      browserConfig,
      timeouts: this.TIMEOUTS,
      cookieBannerSelectors: this.COOKIE_BANNER_SELECTORS,
    };
  }

  getBrowserConfig(browserType: BrowserType = 'chrome'): BrowserConfig {
    const cfg = this.BROWSER_CONFIGS[browserType];
    if (!cfg) throw new Error(`Unknown browserType: ${browserType}`);
    return cfg;
  }

  getTimeouts(): Timeouts {
    return this.TIMEOUTS;
  }

  getCookieBannerSelectors(): CookieBannerSelectors {
    return this.COOKIE_BANNER_SELECTORS;
  }

  /**
   * SPÄTER: Config aus Datenbank laden
   */
  async getConfigFromDatabase(configId: string): Promise<CrawlerConfig> {
    console.log('Loading config for:', configId);
    throw new Error('Not implemented yet');
  }

  private _getBraveExecutablePath(): string {
    const platform = process.platform;
    if (platform === 'win32') {
      return 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
    
    }
    if (platform === 'linux') {
      return '/usr/bin/brave-browser';
    }

    // macOS
    return '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
  }

}