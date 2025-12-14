// apps/api/src/db.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

export interface NewCookie {
    sessionId: number;
    name: string;
    value?: string;
    domain?: string;
    path?: string;
    size?: number;
    httpOnly?: boolean;
    sameSite?: boolean;
    expirationAt?: Date;
    location?: 'cookie' | 'indexDB' | 'localStorage';
}

export interface NewSession {
    url: string;
    category?: string;
    configId: number;
}

export interface Session {
    id: number;
    url: string;
    category: string | null;
    created_at: Date;
    config_id: number | null;
}

export interface NewConfig {
    browser: 'chrome' | 'firefox' | 'brave';
    cookies: 'yes' | 'no' | 'opt';
    js: boolean;
    adBlocker: boolean;
}

export interface Config {
    id: number;
    browser: 'chrome' | 'firefox' | 'brave';
    cookies: 'yes' | 'no' | 'opt';
    js: boolean;
    ad_blocker: boolean;
}

@Injectable()
export class DbService implements OnModuleDestroy {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
        });
    }

    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
        return this.pool.query(text, params);
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
    // GET Cookies nach Session.ID
    // Test curl "http://localhost:3000/api/sessions/1/cookies"
    async getCookiesForSession(sessionId: number) {
        const sql = `
            SELECT *
            FROM cookies
            WHERE session_id = $1
            ORDER BY created_at DESC;
        `;
        const { rows } = await this.query(sql, [sessionId]);
        return rows;
    }

    // GET Cookies nach Browser Config(ID)
    // Test curl "http://localhost:3000/api/sessions/cookies/by-config/2"
    async getCookiesForConfig(configId: number) {
        const sql = `
            SELECT c.*
            FROM cookies c
            JOIN session s ON c.session_id = s.id
            WHERE s.config_id = $1
            ORDER BY c.created_at DESC;
        `;
        const { rows } = await this.query(sql, [configId]);

        return rows;
    }
    // GET Cookies nach URL-String
    async getCookiesForUrl(urlPart: string) {
        const sql = `
        SELECT c.*
        FROM cookies c
        JOIN session s ON c.session_id = s.id
        WHERE s.url ILIKE $1
        ORDER BY c.created_at DESC;
    `;
        const { rows } = await this.query(sql, [`%${urlPart}%`]);
        console.log(rows);
        return rows;
    }

    // Alle URLs zu einer Session-ID
    // Test curl "http://localhost:3000/api/sessions/2/urls"
    async getUrlsForSession(sessionId: number) {
        const sql = `
            SELECT url
            FROM session
            WHERE id = $1;
        `;
        const { rows } = await this.query<{ url: string }>(sql, [sessionId]);
        return rows;
    }

    // Alle Session-IDs für eine gegebene config_id
    // Test curl "http://localhost:3000/api/sessions/by-config/2"
    async getSessionIdsForConfig(configId: number) {
        const sql = `
            SELECT id
            FROM session
            WHERE config_id = $1
            ORDER BY id ASC;
        `;
        const { rows } = await this.query<{ id: number }>(sql, [configId]);
        return rows;
    }

    // Test curl "http://localhost:3000/api/sessions/2"
    async getSessionById(id: number) {
        const sql = `
            SELECT *
            FROM session
            WHERE id = $1
            LIMIT 1;
        `;
        const { rows } = await this.query<Session>(sql, [id]);
        return rows[0] ?? null;
    }


    // Test curl "http://localhost:3000/api/sessions"
    // Test curl "http://localhost:3000/api/sessions"
    async getAllSessions() {
        const sql = `
            SELECT 
                s.id,
                s.url,
                s.created_at as "createdAt",
                c.browser,
                c.js as "jsEnabled",
                c.ad_blocker as "adBlockerEnabled",
                CASE WHEN c.cookies = 'yes' OR c.cookies = 'opt' THEN true ELSE false END as "cookieBannerHandled"
            FROM session s
            LEFT JOIN config c ON s.config_id = c.id
            ORDER BY s.id ASC;
        `;
        const { rows } = await this.query(sql, []);
        return rows;
    }

    // Test curl "http://localhost:3000/api/sessions/configs/2"
    async getConfigById(id: number) {
        const sql = `
        SELECT *
        FROM config
        WHERE id = $1
        LIMIT 1;
    `;
        const { rows } = await this.query<Config>(sql, [id]);
        return rows[0] ?? null;
    }


    // POST neuen Cookie Eintrag erstellen
    /* Test
        curl -X POST \
            -H "Content-Type: application/json" \
            -d '{
                "sessionId": 1,
                "name": "tracking_consent",
                "value": "value",
                "domain": "example.com",
                "size": 12,
                "httpOnly": false,
                "location": "cookie"
                }' \
            "http://localhost:3000/api/sessions/cookies"
    */
    async createCookie(cookieData: NewCookie) {
        const sql = `
            INSERT INTO cookies (
                session_id,
                name,
                value,
                domain,
                path,
                size,
                http_only,
                same_site,
                expiration_at,
                location
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        const params = [
            cookieData.sessionId,
            cookieData.name,
            cookieData.value || null,
            cookieData.domain || null,
            cookieData.path || null,
            cookieData.size || null,
            cookieData.httpOnly ?? null,
            cookieData.sameSite ?? null,
            cookieData.expirationAt || null,
            cookieData.location || null,
        ];

        const { rows } = await this.query(sql, params);
        return rows[0];
    }

    // neuer Session Eintrag
    /* Test
        curl -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "url": "https://new-news-page.net",
            "category": "news",
            "configId": 3 
            }' \
        "http://localhost:3000/api/sessions/sessions"
    */
    async createSession(sessionData: NewSession) {
        const sql = `
            INSERT INTO session (
                url,
                category,
                config_id
            )
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const params = [
            sessionData.url,
            sessionData.category || null,
            sessionData.configId,
        ];

        const { rows } = await this.query(sql, params);
        return rows[0];
    }

    /*
    TEST - PRÜFT NCIHT OB CONFIG SCHON VORHANDEN IST!
    curl -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "browser": "firefox",
            "cookies": "no",
            "js": false,
            "adBlocker": true
            }' \
        "http://localhost:3000/api/sessions/config"
    */
    async createConfig(configData: NewConfig) {
        const sql = `
            INSERT INTO config (
                browser,
                cookies,
                js,
                ad_blocker
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const params = [
            configData.browser,
            configData.cookies,
            configData.js,
            configData.adBlocker,
        ];

        const { rows } = await this.query(sql, params);
        return rows[0];
    }
}





