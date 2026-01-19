import { Controller, Get, Param } from '@nestjs/common';
import { CookiesService } from './cookies.service';
import { DbService } from '../db/db.service';

// Controller to handle cookie-related endpoints
@Controller('cookies')
export class CookiesController {
    constructor(
        private readonly cookiesService: CookiesService,
        private readonly dbService: DbService
    ) { }

    // Endpoint to get cookie statistics for a specific session
    @Get('/stats/:sessionId')
    async getStats(@Param('sessionId') sessionId: string) {
        return this.cookiesService.getStats(Number(sessionId));
    }

    // Endpoint to get cookies for a specific session
    @Get('/by-session/:sessionId')
    getCookiesForSession(@Param('sessionId') sessionId: string) {
        return this.dbService.getCookiesForSession(Number(sessionId));
    }

    // Endpoint to get cookies for a specific configuration
    @Get('/by-config/:configId')
    getCookiesForConfig(@Param('configId') configId: string) {
        return this.dbService.getCookiesForConfig(Number(configId));
    }

    // Endpoint to get cookies for a specific URL part
    @Get('/by-url/:urlPart')
    getCookiesForUrl(@Param('urlPart') urlPart: string) {
        return this.dbService.getCookiesForUrl(urlPart);
    }
}
