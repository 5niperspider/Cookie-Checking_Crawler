import { Controller, Get, Param } from '@nestjs/common';
import { CookiesService } from './cookies.service';
import { DbService } from '../db/db.service';

@Controller('cookies')
export class CookiesController {
    constructor(
        private readonly cookiesService: CookiesService,
        private readonly dbService: DbService
    ) { }

    @Get()
    getCookies() {
        return this.cookiesService.getCookies();
    }

    @Get('/by-session/:sessionId')
    getCookiesForSession(@Param('sessionId') sessionId: string) {
        return this.dbService.getCookiesForSession(Number(sessionId));
    }

    @Get('/by-config/:configId')
    getCookiesForConfig(@Param('configId') configId: string) {
        return this.dbService.getCookiesForConfig(Number(configId));
    }

    @Get('/by-url/:urlPart')
    getCookiesForUrl(@Param('urlPart') urlPart: string) {
        return this.dbService.getCookiesForUrl(urlPart);
    }
}
