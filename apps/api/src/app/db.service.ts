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

    // neuen Cookie Eintrag erstellen
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
        return rows[0]; // Gibt den erstellten Datensatz zurück
    }
}





