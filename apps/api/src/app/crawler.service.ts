import { Injectable } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { DbService, NewCookie } from './db/db.service';
import { CrawlerConfigService, CrawlerConfig } from './crawler.config';

@Injectable()
export class CrawlerService {
  constructor(
    private readonly dbService: DbService,
    private readonly configService: CrawlerConfigService,
  ) {}

  async crawler(url: string, sessionId: number, configId: number): Promise<boolean> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // 1. Récupérer la configuration complète (DB + constants)
      const config: CrawlerConfig = await this.configService.getConfigFromDatabase(configId);

      // 2. Lancer le navigateur avec la config
      browser = await puppeteer.launch({
        headless: config.browserConfig.headless,
        args: config.browserConfig.args,
        defaultViewport: config.browserConfig.defaultViewport,
        executablePath: config.browserConfig.executablePath,
      });

      page = await browser.newPage();

      // Activer / désactiver JS selon la config DB
      await page.setJavaScriptEnabled(config.jsEnabled);

      // 3. Timeouts
      page.setDefaultNavigationTimeout(config.timeouts.navigation);
      page.setDefaultTimeout(config.timeouts.waitForSelector);

      // 4. Naviguer vers l'URL
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.timeouts.navigation,
      });

      // 5. Gérer la bannière de cookies
      await this._handleCookieBanner(page, config);

      try {
        await page.waitForNetworkIdle({ timeout: 5000 });
      } catch {
        // Si le réseau ne se calme pas, on continue quand même après 5s
      }

      const cookies = await page.cookies();
      console.log(`Found ${cookies.length} cookies`);

      for (const cookie of cookies) {
        let expirationDate: Date | undefined = undefined;
        if (cookie.expires && cookie.expires > 0) {
          expirationDate = new Date(cookie.expires * 1000);
        }

        const cookieData: NewCookie = {
          sessionId: sessionId,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          size: cookie.size,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite ? true : false,
          expirationAt: expirationDate,
          location: 'cookie',
        };

        await this.dbService.createCookie(cookieData);
      }

      console.log(`Successfully crawled ${url}`);
      return true;
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      throw error;
    } finally {
      if (page) {
        await page.close().catch(() => console.warn('Error closing page'));
      }
      if (browser) {
        await browser.close().catch(() => console.warn('Error closing browser'));
      }
    }
  }

  private async _handleCookieBanner(page: Page, config: CrawlerConfig): Promise<void> {
    try {
      console.log('Checking for cookie banner...');

      const selectors = config.cookieBannerSelectors[config.cookieStrategy];

      for (const selector of selectors) {
        try {
          const element = await page.waitForSelector(selector, {
            timeout: config.timeouts.cookieBanner,
            visible: true,
          });

          if (element) {
            console.log(`Found cookie banner button: ${selector}`);
            await element.click();
            console.log(
              `Cookie banner handled with strategy: ${config.cookieStrategy}`
            );
            await new Promise(resolve => setTimeout(resolve, 1000));
            return;
          }
        } catch {
          continue;
        }
      }

      console.log('No cookie banner found (for current strategy)');
    } catch (error) {
      console.warn('Error handling cookie banner:', error);
    }
  }
}