import { Injectable } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { DbService, NewCookie } from './db/db.service';
import { CrawlerConfigService, CrawlerConfig } from './crawler.config';

// Service responsible for crawling web pages and extracting cookies
@Injectable()
export class CrawlerService {
  constructor(
    private readonly dbService: DbService,
    private readonly configService: CrawlerConfigService
  ) { }

  async crawler(
    url: string,
    sessionId: number,
    configId: number
  ): Promise<boolean> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    // Fetch crawler configuration from the database
    try {
      console.log(
        `\n[Session ${sessionId}] Fetching config ID ${configId} from database...`
      );
      const config: CrawlerConfig =
        await this.configService.getConfigFromDatabase(configId);
      console.log(
        `[Session ${sessionId}] Config loaded: Browser=${config.browser}, Strategy=${config.cookieStrategy}, JS=${config.jsEnabled}`
      );

      const isFirefox = config.browser === 'firefox';

      // Launch Puppeteer with the specified browser and configuration
      console.log(`[Puppeteer] Launching ${config.browser}...`);
      browser = await puppeteer
        .launch({
          browser: isFirefox ? 'firefox' : 'chrome',
          headless: config.browserConfig.headless,
          args: config.browserConfig.args,
          defaultViewport: config.browserConfig.defaultViewport,
          executablePath: config.browserConfig.executablePath,
        })
        .catch((error) => {
          // Handle common launch errors
          console.error(`Failed to launch ${config.browser}:`, error.message);
          if (error.message.includes('ENOENT')) {
            throw new Error(
              `${config.browser} executable not found. Please install ${config.browser} or check the executable path.`
            );
          }
          if (error.message.includes('EACCES')) {
            throw new Error(
              `Permission denied accessing ${config.browser} executable. Please check file permissions.`
            );
          }
          throw new Error(
            `Failed to launch ${config.browser}: ${error.message}`
          );
        });

        // Open a new page and configure it
      page = await browser.newPage();
      if (!isFirefox) {
        await page.setJavaScriptEnabled(config.jsEnabled);
      }

      // Set navigation and selector timeouts
      page.setDefaultNavigationTimeout(config.timeouts.navigation);
      page.setDefaultTimeout(config.timeouts.waitForSelector);

      // Navigate to the target URL
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      await this.configService.handleCookieBanner(page, config);

      try {
        await page.waitForNetworkIdle({ timeout: 5000 });
      } catch {
        // Ignore timeout errors
      }

      // Helper function to sleep for a specified duration
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // statt page.waitForTimeout(2000)
      await sleep(10000);

      let allCookies: any[] = [];

      if (!isFirefox) {
        // Chrome: CDP OK
        const client = await page.createCDPSession();
        const response = await client.send('Network.getAllCookies');
        allCookies = response.cookies;
        await client.detach();
      } else {
        // Firefox BiDi: Fallback auf browser.cookies() (alle Contexts)
        allCookies = await browser.cookies();
      }

      // Include cookies from all frames
      const frameCookies = await page.browserContext().cookies();
      allCookies.push(...frameCookies);

      // Deduplicate cookies based on name, domain, and path
      const cookies = this.deduplicateCookies(allCookies);

      // Store cookies in the database
      console.log(
        `[Session ${sessionId}] Found ${cookies.length} cookies with config ${configId}`
      );
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

      // Log successful crawl
      console.log(
        `[Session ${sessionId}] Successfully crawled ${url} with config ${configId}`
      );
      return true;
    } catch (error) {
      // Log and rethrow errors for higher-level handling
      console.error(`Error crawling ${url}:`, error);
      throw error;
    } finally {
      // Ensure proper cleanup of resources
      if (page) {
        await page.close().catch(() => console.warn('Error closing page'));
      }
      if (browser) {
        await browser
          .close()
          .catch(() => console.warn('Error closing browser'));
      }
    }
  }

  // Deduplicate cookies based on name, domain, and path
  private deduplicateCookies(cookies: any[]): any[] {
    const seen = new Set<string>();
    return cookies.filter((cookie) => {
      const key = `${cookie.name}-${cookie.domain}-${cookie.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
