// apps/api/src/db.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

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
}
