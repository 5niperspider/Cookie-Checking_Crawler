import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class CrawlerService {

   async crawler(url:string) {
        const browser = await puppeteer.launch();

        const page = await browser.newPage();

        await page.goto(url);

        return await browser.cookies();
    }
}
