import { Controller, Get, Param } from '@nestjs/common';
import { CookiesService } from './cookies.service';
import { DbService } from '../db/db.service';

@Controller('cookies')
export class CookiesController {
    constructor(
        private readonly cookiesService: CookiesService,
        private readonly db: DbService
    ) { }

    @Get()
    getCookies() {
        return this.cookiesService.getCookies();
    }

    @Get('/by-config/:configId')
    getCookiesForConfig(@Param('configId') configId: string) {
        return this.db.getCookiesForConfig(Number(configId));
    }

    @Get('/by-url/:urlPart')
    getCookiesForUrl(@Param('urlPart') urlPart: string) {
        return this.db.getCookiesForUrl(urlPart);
    }
}
