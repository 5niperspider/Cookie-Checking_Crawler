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

// Service to manage crawler configurations and cookie banner handling
@Injectable()
export class CrawlerConfigService {
  private BROWSER_CONFIGS: Record<BrowserType, BrowserConfig>;
  private TIMEOUTS: Timeouts;
  private COOKIE_BANNER_SELECTORS: CookieBannerSelectors;

  // Initialize default configurations
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
        headless: true,
        args: [
          '--width=1920',
          '--height=1080',
        ],
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

    // Define timeouts for various operations
    this.TIMEOUTS = {
      navigation: 30000,
      waitForSelector: 10000,
      cookieBanner: 5000,
    };

    // Define selectors for cookie banner buttons
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

  // Fetch configuration from the database and map to CrawlerConfig
  async getConfigFromDatabase(configId: number): Promise<CrawlerConfig> {
    const dbConfig = await this.dbService.getConfigById(configId);
    if (!dbConfig) throw new Error(`Config with ID ${configId} not found`);
    return this._mapDbConfigToCrawlerConfig(dbConfig);
  }

  // Handle cookie banner based on the specified strategy
  async handleCookieBanner(page: Page, config: CrawlerConfig): Promise<void> {
    if (!config.jsEnabled) {
      console.log('JS disabled – skipping cookie banner handling');
      return;
    }
    console.log('Waiting for cookie banner...');
    // Check for the presence of a cookie banner
    const bannerExists = await this.waitForCookieBanner(page, this.TIMEOUTS.cookieBanner);
    if (!bannerExists) {
      console.log('No cookie banner detected');
      return;
    }
    console.log('Cookie banner detected');
    // Try to find and click the appropriate button using selectors
    const selectors = this.COOKIE_BANNER_SELECTORS[config.cookieStrategy];
    const button = await this.findBestButton(page, selectors);
    if (button) {
      // Click the button if found via selectors
      await this.safeClick(button);
      console.log(`Clicked ${config.cookieStrategy} via selector`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (config.cookieStrategy === 'optional') {
        await this.handleCookiePreferences(page);
      }
      return;
    }
    // If no button found via selectors, try clicking by text
    const textClicked = await this.clickButtonByText(page, config.cookieStrategy);
    if (textClicked) {
      console.log(`Clicked ${config.cookieStrategy} via text`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (config.cookieStrategy === 'optional') {
        await this.handleCookiePreferences(page);
      }
    } else {
      console.log(`No ${config.cookieStrategy} button found`);
    }
  }

  // Handle the cookie preferences dialog for optional cookies
  private async handleCookiePreferences(page: Page): Promise<void> {
    console.log('Handling cookie preferences dialog...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    const toggleSelectors = [
      'input[type="checkbox"][id*="analytics" i]:not([disabled])',
      'input[type="checkbox"][id*="marketing" i]:not([disabled])',
      'input[type="checkbox"][id*="advertising" i]:not([disabled])',
      'input[type="checkbox"][id*="tracking" i]:not([disabled])',
      'input[type="checkbox"][id*="performance" i]:not([disabled])',
      'input[type="checkbox"][id*="social" i]:not([disabled])',
      'input[type="checkbox"][class*="analytics" i]:not([disabled])',
      'input[type="checkbox"][class*="marketing" i]:not([disabled])',
      'input[type="checkbox"][class*="advertising" i]:not([disabled])',
      'button[role="switch"][aria-checked="true"][aria-label*="analytics" i]',
      'button[role="switch"][aria-checked="true"][aria-label*="marketing" i]',
      'button[role="switch"][aria-checked="true"][aria-label*="advertising" i]',
      '[class*="toggle"][class*="analytics"]',
      '[class*="toggle"][class*="marketing"]',
    ];

    // Iterate through toggle selectors and disable checked options
    let toggledCount = 0;
    for (const selector of toggleSelectors) {
      try {
        // Find all matching toggle elements
        const elements = await page.$$(selector);
        for (const element of elements) {
          // Check if the toggle is currently checked/enabled
          const isChecked = await element.evaluate((el: Element) => {
            if (el instanceof HTMLInputElement) {
              return el.checked;
            }
            if (el.getAttribute('role') === 'switch') {
              return el.getAttribute('aria-checked') === 'true';
            }
            return false;
          });
          
          // Click to disable if it is checked
          if (isChecked) {
            await this.safeClick(element);
            toggledCount++;
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } catch {
        // Continue to next selector if this one fails
      }
    }
    
    console.log(`Disabled ${toggledCount} optional cookie categories`);
    
    // Look for and click the "Save" or "Confirm" button
    const saveSelectors = [
      'button[id*="save" i]',
      'button[class*="save" i]',
      'button[id*="confirm" i]',
      'button[class*="confirm" i]',
      'button[id*="submit" i]',
      'button[class*="submit" i]',
      'button[id*="speichern" i]',
      'button[class*="speichern" i]',
      'button[aria-label*="save" i]',
      'button[aria-label*="confirm" i]',
      '[data-testid*="save"]',
      '[data-testid*="confirm"]',
    ];
    
    //  Iterate through save button selectors and click the first visible one
    for (const selector of saveSelectors) {
      try {
        // Find the button element
        const button = await page.$(selector);
        if (button) {
          // Check if the button is visible
          const isVisible = await button.evaluate((el: Element) => {
            if (!(el instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          });
          
          //  Click the button if it is visible
          if (isVisible) {
            await this.safeClick(button);
            console.log('Clicked save/confirm button in preferences dialog');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return;
          }
        }
      } catch {
        // Continue to next selector
      }
    }
    
    console.log('No save/confirm button found in preferences dialog');
  }
  // Wait for the cookie banner to appear on the page
  private async waitForCookieBanner(page: Page, timeout: number): Promise<boolean> {
    try {
      // Wait for known cookie banner indicators or elements
      await page.waitForFunction(
        () => {
          // Check for known global objects indicating cookie banners
          if (
            window['OneTrust'] ||
            window['UC_UI'] ||
            window['Cookiebot'] ||
            window['__tcfapi'] ||
            window['Didomi']
          ) {
            return true;
          }
          // Check for visible elements containing cookie-related keywords
          const keywords = ['cookie', 'consent', 'gdpr', 'datenschutz'];
          const elements = Array.from(document.querySelectorAll(
            'div, section, aside, [role="dialog"], [role="banner"]',
          ));

          // Iterate through elements to find a visible cookie banner
          for (const el of elements) {
            // Check element size and visibility
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            // Look for keywords in the text content
            if (
              rect.height > 50 &&
              rect.width > 200 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden'
            ) {
              // Check for keywords in text content
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

  // Find the best matching button based on provided selectors
  private async findBestButton(
    page: Page,
    selectors: string[],
  ): Promise<ElementHandle | null> {
    const bestSelector = await page.evaluate((selectorList) => {
      let best: { selector: string; score: number } | null = null;

      // Iterate through each selector to find the best matching button
      for (const selector of selectorList) {
        try {
          // Find all elements matching the selector
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

  // Safely click a button by scrolling it into view first
  private async safeClick(button: ElementHandle): Promise<void> {
    await button.evaluate(el =>
      el.scrollIntoView({ behavior: 'instant', block: 'center' }),
    );
    await button.evaluate(el => (el as HTMLElement).click());
  }

  // Click a button based on its text content
  private async clickButtonByText(
    page: Page,
    strategy: CookieStrategy,
  ): Promise<boolean> {
    const texts: Record<CookieStrategy, string[]> = {
      accept: ['accept all', 'alle akzeptieren', 'agree'],
      reject: ['reject all', 'alle ablehnen', 'decline'],
      optional: ['settings', 'preferences', 'einstellungen'],
    };
    
    // Execute in page context to find and click button by text
    return page.evaluate((labels) => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      // Iterate through labels to find a matching button
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

  // Map database configuration to CrawlerConfig
  private _mapDbConfigToCrawlerConfig(dbConfig: Config): CrawlerConfig {
    const browserType = dbConfig.browser as BrowserType;
    const baseBrowserConfig = this.BROWSER_CONFIGS[browserType];
    // Validate browser type
    if (!baseBrowserConfig) throw new Error(`Unknown browser ${browserType}`);
    
    const jsEnabled = dbConfig.js;
    const browserConfig = this._applyJsSettings(baseBrowserConfig, browserType, jsEnabled);

    // Return the complete crawler configuration
    return {
      browser: browserType,
      browserConfig,
      timeouts: this.TIMEOUTS,
      cookieBannerSelectors: this.COOKIE_BANNER_SELECTORS,
      cookieStrategy: this._mapDbCookieStrategy(dbConfig.cookies),
      jsEnabled,
    };
  }

  // Apply JavaScript settings to browser configuration
  private _applyJsSettings(
    config: BrowserConfig,
    browser: BrowserType,
    jsEnabled: boolean
  ): BrowserConfig {
    // For Chrome and Brave, disable JavaScript via command line args
    if (browser === 'firefox' && !jsEnabled) {
      // For Firefox, disable JavaScript through preferences
      return {
        ...config,
        args: [
          ...config.args,
          '-pref',
          'javascript.enabled=false',
        ],
      };
    }
    return config;
  }

  // Map database cookie strategy to internal representation
  private _mapDbCookieStrategy(dbCookies: 'yes' | 'no' | 'opt'): CookieStrategy {
    if (dbCookies === 'yes') return 'accept';
    if (dbCookies === 'no') return 'reject';
    if (dbCookies === 'opt') return 'optional';
    throw new Error(`Unknown cookie strategy ${dbCookies}`);
  }

  // Get the executable path for Brave browser based on the OS
  private _getBraveExecutablePath(): string {
    // Determine the default installation path for Brave browser
    if (process.platform === 'win32') {
      return 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
    }
    //  Linux and macOS paths
    if (process.platform === 'linux') {
      return '/usr/bin/brave-browser';
    }
    return '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
  }
}
