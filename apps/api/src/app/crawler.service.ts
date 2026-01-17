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
      console.log(`\n[Session ${sessionId}] Fetching config ID ${configId} from database...`);
      const config: CrawlerConfig = await this.configService.getConfigFromDatabase(configId);
      console.log(`[Session ${sessionId}] Config loaded: Browser=${config.browser}, Strategy=${config.cookieStrategy}, JS=${config.jsEnabled}`);

      browser = await puppeteer.launch({
        headless: config.browserConfig.headless,
        args: config.browserConfig.args,
        defaultViewport: config.browserConfig.defaultViewport,
        executablePath: config.browserConfig.executablePath,
      }).catch(error => {
        console.error(`Failed to launch ${config.browser} browser:`, error.message);
        if (error.message.includes('ENOENT')) {
          throw new Error(`${config.browser} executable not found. Please install ${config.browser} or check the executable path.`);
        }
        if (error.message.includes('EACCES')) {
          throw new Error(`Permission denied accessing ${config.browser} executable. Please check file permissions.`);
        }
        throw new Error(`Failed to launch ${config.browser}: ${error.message}`);
      });

      page = await browser.newPage();
      await page.setJavaScriptEnabled(config.jsEnabled);

      // 3. Timeouts
      page.setDefaultNavigationTimeout(config.timeouts.navigation);
      page.setDefaultTimeout(config.timeouts.waitForSelector);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.timeouts.navigation,
      });
      await this.configService.handleCookieBanner(page, config);
      try {
        await page.waitForNetworkIdle({ timeout: 5000 });
      } catch {
        // Ignore timeout errors here
      }
      const cookies = await page.cookies();
      console.log(`[Session ${sessionId}] Found ${cookies.length} cookies with config ${configId}`);
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

      console.log(`[Session ${sessionId}] Successfully crawled ${url} with config ${configId}`);
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

}
