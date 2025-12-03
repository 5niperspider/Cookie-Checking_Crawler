import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';

@Injectable()
export class AppService {
  constructor(private readonly db: DbService) {}

  async getData(): Promise<{ message: string; sessions: any[] }> {
    const result = await this.db.query('SELECT * FROM session LIMIT 5');
    return { message: 'Hello API', sessions: result.rows };
  }
}
