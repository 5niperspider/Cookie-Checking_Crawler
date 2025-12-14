import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { DbService, NewCookie } from './db/db.service';


@Injectable()
export class CrawlerService {
    constructor( private readonly dbservice: DbService) {}

   async crawler(url:string , session_id:number): Promise<boolean>{

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url,{ waitUntil: 'networkidle2' } );
        const cookies = await page.cookies();

        for (const cookie of cookies) {
            let expirationDate: Date | undefined;
            if (cookie.expires && cookie.expires > 0) {
                expirationDate = new Date(cookie.expires * 1000);
            }
            const cookieData: NewCookie = {
                sessionId: session_id,  
                name: cookie.name,  
                value: cookie.value,  
                domain: cookie.domain,  
                path: cookie.path,  
                size: cookie.size,  
                httpOnly: cookie.httpOnly,  
                sameSite: cookie.sameSite ? true : false,  
                expirationAt: expirationDate,  
                location: 'cookie'
            };

            await this.dbservice.createCookie(cookieData);
        }

        await browser.close();
        return true ; 


       
    }
    

}
