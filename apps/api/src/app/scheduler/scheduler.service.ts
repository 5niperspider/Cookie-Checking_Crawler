import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DbService } from '../db/db.service';
import { CrawlerService } from '../crawler.service';

const configLength = 3;

@Injectable()
export class SchedulerService {
    constructor(
        private readonly dbService: DbService,
        private readonly crawlerService: CrawlerService,
      ) { }
    
    private tasks:{id: string, url: string, status: string, sessions: number[], sessionsDone: number[]}[] = [];

    addTasks(tasks: string[]) {
        const ids: string[] = []

        for (const url of tasks) {
            const id: string = randomUUID();
            this.tasks.push({ id: id, url: url, status: 'scheduled', sessions: [], sessionsDone: []});
            ids.push(id);
            this.asyncRunTask(id);
        }
        return { ids: ids, status: 'scheduled' }
    }

    getStatus(id: string) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) {
            throw new Error(`Task with id ${id} not found`);
        }
        return { id: id, url: task.url, status: task.status };
    }

    private async asyncRunTask(id: string) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) {
            throw new Error(`Task with id ${id} not found`);
        }

        task.status = 'in-progress';
        const url = task.url;
        for (let conf = 1; conf < configLength+1; conf++) {
            const session = await this.dbService.createSession({ url: url, configId: conf});
            task.sessions.push(session.id);

            const done = await this.crawlerService.crawler(url, session.id);

            if (await done) {
                task.sessionsDone.push(session.id);
                
                if (task.sessionsDone.length === task.sessions.length) {
                    task.status = 'completed';
                }
            }
            
            
        }
    }
}
