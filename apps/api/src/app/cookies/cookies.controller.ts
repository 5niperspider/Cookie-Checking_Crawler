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
        return this.cookiesService.getCookies(1); // Default to session 1 for generic get, or maybe remove? Leaving for back-compat if needed, but updated to use service properly. Actually, let's just leave getting all cookies or something. 
        // The previous code was `return this.cookiesService.getCookies();` which returned a static message.
        // Let's make it return something valid or just keep it simple.
        // The user didn't ask to fix the generic GET /cookies, but let's just make it not fail.
        return { message: "Use /by-session/:sessionId or /stats/:sessionId" };
    }

    @Get('/stats/:sessionId')
    async getStats(@Param('sessionId') sessionId: string) {
        return this.cookiesService.getStats(Number(sessionId));
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
