import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { DbService, NewCookie, NewSession, NewConfig } from './db.service';

@Controller('sessions')
export class DbController {
    constructor(private readonly db: DbService) { }

    @Get('cookies/by-config/:configId')
    getCookiesForConfig(@Param('configId') configId: string) {
        return this.db.getCookiesForConfig(Number(configId));
    }

    @Get('cookies/by-url/:urlPart')
    getCookiesForUrl(@Param('urlPart') urlPart: string) {
        return this.db.getCookiesForUrl(urlPart);
    }

    @Get(':id/cookies')
    getCookiesForSession(@Param('id') id: string) {
        return this.db.getCookiesForSession(Number(id));
    }

    @Get(':id/urls')
    getUrlsForSession(@Param('id') id: string) {
        return this.db.getUrlsForSession(Number(id));
    }

    @Get('by-config/:configId')
    getSessionIdsForConfig(@Param('configId') configId: string) {
        return this.db.getSessionIdsForConfig(Number(configId));
    }

    @Post('cookies')
    createCookie(@Body() cookieData: NewCookie) {
        // 'sessionId' wird als Teil des Body erwartet
        return this.db.createCookie(cookieData);
    }

    @Post('sessions')
    createSession(@Body() sessionData: NewSession) {
        return this.db.createSession(sessionData);
    }

    @Post('config')
    createConfig(@Body() configData: NewConfig) {
        return this.db.createConfig(configData);
    }



}