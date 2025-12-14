import { Injectable } from '@nestjs/common';
import { CreateSessionDto } from '../sessions/dto/create-session.dto';
import { randomUUID } from 'node:crypto';
import { DbService } from '../db/db.service';

@Injectable()
export class SchedulerService {
    constructor(
        private readonly dbService: DbService,
      ) { }
    
    private tasks:{id: string, url: string, config: number[], status: string, sessions: number[], sessionsDone: number[]}[] = [];

    addTask(task: CreateSessionDto) {
        const url: string = task.url;
        const config: number[] = task.config;
        const id: string = randomUUID()

        this.tasks.push({ id: id, url: url, config: config, status: 'scheduled', sessions: [], sessionsDone: []});
        this.asyncRunTask(id);

        return { id: id, status: 'scheduled' }
    }

    getStatus(id: string) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) {
            throw new Error(`Task with id ${id} not found`);
        }
        return { id: id, status: task.status };
    }

    private async asyncRunTask(id: string) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) {
            throw new Error(`Task with id ${id} not found`);
        }

        task.status = 'in-progress';
        const url = task.url;
        for (let i = 0; i < task.config.length; i++) {
            const configId = task.config[i];
            const session = await this.dbService.createSession({ url: url, configId: configId});
            task.sessions.push(session.id);

            // Simulate some async work for each session
            await new Promise(resolve => setTimeout(resolve, 1000));

            task.sessionsDone.push(session.id);

            if (task.sessionsDone.length === task.sessions.length) {
                task.status = 'completed';
            }
        }
    }
}
