// apps/api/src/crawler.config.ts
import { Injectable } from '@nestjs/common';
import { DbService, Config } from './db/db.service';
import { Page, ElementHandle } from 'puppeteer';

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
        executablePath: this._getChromeExecutablePath(),
      },

      firefox: {
        executablePath: this._getFirefoxExecutablePath(),
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
        '[data-testid="uc-accept-all-button"]',
        '#onetrust-accept-btn-handler',
        'button[id*="accept" i]',
        'button[class*="accept" i]',
        'button[aria-label*="accept" i]',
        'a[id*="accept" i]',
        'a[class*="accept" i]',
        'button[id*="akzeptieren" i]',
        'button[class*="akzeptieren" i]',
        'button[aria-label*="akzeptieren" i]',
        'a[id*="akzeptieren" i]',
        'a[class*="akzeptieren" i]',
        'button:contains("Accept")',
        'button:contains("Agree")',
        'button:contains("Akzeptieren")',
        'button:contains("Zustimmen")',
        '[role="button"][aria-label*="accept" i]',
        '[role="button"][aria-label*="akzeptieren" i]',
        '.scmp-sdk-banner__buttons__accept-button',
        '.cookie-consent-accept',
        '.cookie-banner .accept',
      ],
      reject: [
        // OneSignal, CookieYes, OneTrust
        '[data-testid="banner-reject-all-button"]',
        '[data-testid="uc-reject-all-button"]',
        '#onetrust-reject-all-handler',
        'button[id*="reject" i]',
        'button[class*="reject" i]',
        'button[id*="decline" i]',
        'button[class*="decline" i]',
        'button[aria-label*="reject" i]',
        'a[id*="reject" i]',
        'a[class*="reject" i]',
    
        'button[id*="ablehnen" i]',
        'button[class*="ablehnen" i]',
        'button[aria-label*="ablehnen" i]',
        'a[id*="ablehnen" i]',
        'a[class*="ablehnen" i]',
        
       
        'button:contains("Reject")',
        'button:contains("Decline")',
        'button:contains("Ablehnen")',
        '[role="button"][aria-label*="reject" i]',
        '[role="button"][aria-label*="ablehnen" i]',
        
       
        '.scmp-sdk-banner__buttons__reject-button',
        '.cookie-consent-reject',
        '.cookie-banner .reject',
      ],
      optional: [
        
        '[data-testid="banner-customize-button"]',
        '#onetrust-pc-btn-handler',
        'button[id*="settings" i]',
        'button[class*="settings" i]',
        'button[id*="preferences" i]',
        'button[class*="preferences" i]',
        'button[id*="custom" i]',
        'button[class*="custom" i]',
        'button[aria-label*="settings" i]',
        'a[id*="settings" i]',
        'a[class*="settings" i]',
      
        'button[id*="einstellungen" i]',
        'button[class*="einstellungen" i]',
        'button[aria-label*="einstellungen" i]',
        'button[id*="optionen" i]',
        'button[class*="optionen" i]',
        'a[id*="einstellungen" i]',
        'a[class*="einstellungen" i]',
        
        'button:contains("Settings")',
        'button:contains("Preferences")',
        'button:contains("Customize")',
        'button:contains("Einstellungen")',
        'button:contains("Optionen")',
        '[role="button"][aria-label*="settings" i]',
        '[role="button"][aria-label*="einstellungen" i]',
        
  
        '.scmp-sdk-banner__buttons__customize-button',
        '.cookie-settings',
        '.cookie-preferences',
        '.cookie-banner .customize',
      ],
    };
  }

  async getConfigFromDatabase(configId: number): Promise<CrawlerConfig> {
    const dbConfig = await this.dbService.getConfigById(configId);
    if (!dbConfig) throw new Error(`Config with ID ${configId} not found`);
    return this._mapDbConfigToCrawlerConfig(dbConfig);
  }


  async handleCookieBanner(page: Page, config: CrawlerConfig): Promise<void> {
    if (!config.jsEnabled) {
      console.log('JS disabled – skipping cookie banner handling');
      return;
    }
    console.log('Waiting for cookie banner...');
    const bannerExists = await this.waitForCookieBanner(page, this.TIMEOUTS.cookieBanner);
    if (!bannerExists) {
      console.log('No cookie banner detected');
      return;
    }
    console.log('Cookie banner detected');
    const selectors = this.COOKIE_BANNER_SELECTORS[config.cookieStrategy];
    const button = await this.findBestButton(page, selectors);
    if (button) {
      await this.safeClick(button);
      console.log(`Clicked ${config.cookieStrategy} via selector`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }
    const textClicked = await this.clickButtonByText(page, config.cookieStrategy);
    if (textClicked) {
      console.log(`Clicked ${config.cookieStrategy} via text`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`No ${config.cookieStrategy} button found`);
    }
  }
  private async waitForCookieBanner(page: Page, timeout: number): Promise<boolean> {
    try {
      await page.waitForFunction(
        () => {
          if (
            window['OneTrust'] ||
            window['UC_UI'] ||
            window['Cookiebot'] ||
            window['__tcfapi'] ||
            window['Didomi']
          ) {
            return true;
          }
          const keywords = ['cookie', 'consent', 'gdpr', 'datenschutz'];
          const elements = Array.from(document.querySelectorAll(
            'div, section, aside, [role="dialog"], [role="banner"]',
          ));

          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (
              rect.height > 50 &&
              rect.width > 200 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden'
            ) {
              const text = el.textContent?.toLowerCase() || '';
              if (el.querySelector('button') && keywords.some(k => text.includes(k))) {
                return true;
              }
            }
          }
          return false;
        },
        { timeout },
      );
      return true;
    } catch {
      return false;
    }
  }
  private async findBestButton(
    page: Page,
    selectors: string[],
  ): Promise<ElementHandle | null> {
    const bestSelector = await page.evaluate((selectorList) => {
      let best: { selector: string; score: number } | null = null;

      for (const selector of selectorList) {
        try {
          document.querySelectorAll(selector).forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden'
            ) {
              const text = el.textContent?.toLowerCase() || '';
              let score = 0;
              if (text.includes('accept') || text.includes('akzeptieren')) score += 10;
              if (text.includes('reject') || text.includes('ablehnen')) score += 10;
              if (!best || score > best.score) best = { selector, score };
            }
          });
        } catch {
          // Selector evaluation failed, continue with next selector
        }
      }
      return best?.selector || null;
    }, selectors);

    return bestSelector ? page.$(bestSelector) : null;
  }
  private async safeClick(button: ElementHandle): Promise<void> {
    await button.evaluate(el =>
      el.scrollIntoView({ behavior: 'instant', block: 'center' }),
    );
    await button.evaluate(el => (el as HTMLElement).click());
  }
  private async clickButtonByText(
    page: Page,
    strategy: CookieStrategy,
  ): Promise<boolean> {
    const texts: Record<CookieStrategy, string[]> = {
      accept: ['accept all', 'alle akzeptieren', 'agree'],
      reject: ['reject all', 'alle ablehnen', 'decline'],
      optional: ['settings', 'preferences', 'einstellungen'],
    };
    return page.evaluate((labels) => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      for (const label of labels) {
        const btn = buttons.find(b =>
          b.textContent?.toLowerCase().includes(label),
        );
        if (btn instanceof HTMLElement) {
          btn.click();
          return true;
        }
      }
      return false;
    }, texts[strategy]);
  }

  private _mapDbConfigToCrawlerConfig(dbConfig: Config): CrawlerConfig {
    const browserType = dbConfig.browser as BrowserType;
    const baseBrowserConfig = this.BROWSER_CONFIGS[browserType];
    if (!baseBrowserConfig) throw new Error(`Unknown browser ${browserType}`);

    return {
      browser: browserType,
      browserConfig: baseBrowserConfig,
      timeouts: this.TIMEOUTS,
      cookieBannerSelectors: this.COOKIE_BANNER_SELECTORS,
      cookieStrategy: this._mapDbCookieStrategy(dbConfig.cookies),
      jsEnabled: true,
    };
  }

  private _mapDbCookieStrategy(dbCookies: 'yes' | 'no' | 'opt'): CookieStrategy {
    if (dbCookies === 'yes') return 'accept';
    if (dbCookies === 'no') return 'reject';
    if (dbCookies === 'opt') return 'optional';
    throw new Error(`Unknown cookie strategy ${dbCookies}`);
  }

  private _getBraveExecutablePath(): string {
    if (process.platform === 'win32') {
      return 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
    }
    if (process.platform === 'linux') {
      return '/usr/bin/brave-browser';
    }
    return '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
  }

  private _getChromeExecutablePath(): string {
    if (process.platform === 'win32') {
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    if (process.platform === 'linux') {
      return '/usr/bin/google-chrome';
    }
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }

  private _getFirefoxExecutablePath(): string {
    if (process.platform === 'win32') {
      return 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';
    }
    if (process.platform === 'linux') {
      return '/usr/bin/firefox';
    }
    return '/Applications/Firefox.app/Contents/MacOS/firefox';
  }
}
