import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { DbService, NewCookie } from './db/db.service';
import { CrawlerConfigService } from './crawler.config';


@Injectable()
export class CrawlerService {
    constructor( 
        private readonly dbservice: DbService,
        private readonly configService: CrawlerConfigService 
    ) {}

  async crawler(url: string, sessionId: number, browserType = 'chrome') {  
        let browser = null;  
        let page = null;  
  
        try {  
            // Config holen  
            const config = this.configService.getConfig(browserType as 'chrome' | 'firefox' | 'brave');  
              
            console.log(`Starting crawler with ${browserType} for URL: ${url}`);  
              
            // Browser starten  
            browser = await puppeteer.launch(config.browserConfig);  
            page = await browser.newPage();  
  
            // Timeouts setzen  
            page.setDefaultNavigationTimeout(config.timeouts.navigation);  
            page.setDefaultTimeout(config.timeouts.waitForSelector);  
  
            // Zur URL navigieren  
            await page.goto(url, {   
                waitUntil: 'networkidle2',  
                timeout: config.timeouts.navigation   
            });  
  
            // Cookie Banner behandeln  
            await this._handleCookieBanner(page, config);  
  
            // Warten für Cookie-Updates  
            await page.waitForTimeout(2000);  
  
            // Cookies extrahieren  
            const cookies = await page.cookies();  
            console.log(`Found ${cookies.length} cookies`);  
  
            // Cookies in DB speichern  
            for (const cookie of cookies) {  
                let expirationDate = undefined;  
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
                    location: 'cookie' as const  
                };  
  
                await this.dbservice.createCookie(cookieData);  
            }  
            console.log(`Successfully crawled ${url}`);  
            return true;  
        } catch (error) {  
            console.error(`Error crawling ${url}:`, error);  
            throw error;  
        } finally {  
            if (page) await page.close().catch(() => console.warn('Error closing page'));  
            if (browser) await browser.close().catch(() => console.warn('Error closing browser'));  
        }  
    }
    

    async _handleCookieBanner(page, config) {  
        try {  
            console.log('Checking for cookie banner...');  
  
            for (const selector of config.cookieBannerSelectors) {  
                try {  
                    const element = await page.waitForSelector(selector, {  
                        timeout: config.timeouts.cookieBanner,  
                        visible: true  
                    });  
  
                    if (element) {  
                        console.log(`Found cookie banner: ${selector}`);  
                        await element.click();  
                        console.log('Cookie banner accepted');  
                        await page.waitForTimeout(1000);  
                        return;  
                    }  
                } catch {  
                    continue;  
                }  
            }  
  
            console.log('No cookie banner found');  
        } catch (error) {  
            console.warn('Error handling cookie banner:', error);  
        }  
    }  
}
