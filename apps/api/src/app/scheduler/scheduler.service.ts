import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DbService } from '../db/db.service';
import { CrawlerService } from '../crawler.service';

const configLength = 12;

type TaskStatus = 'scheduled' | 'in-progress' | 'completed' | 'failed';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly dbService: DbService,
    private readonly crawlerService: CrawlerService,
  ) {}

  private tasks: {
    id: string;
    url: string;
    status: TaskStatus;
    sessions: number[];
    sessionsDone: number[];
  }[] = [];

  // Queue für URLs
  private queue: string[] = [];
  private running = false;

  addTasks(urls: string[]) {
    const ids: string[] = [];

    for (const url of urls) {
      const id = randomUUID();
      this.tasks.push({
        id,
        url,
        status: 'scheduled',
        sessions: [],
        sessionsDone: [],
      });

      this.queue.push(id);
      ids.push(id);
    }

    this.runNext();

    return { ids, status: 'scheduled' };
  }

  getStatus(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    return { id, url: task.url, status: task.status };
  }

  private async runNext() {
    if (this.running || this.queue.length === 0) return;

    const nextId = this.queue.shift();
    if (!nextId) return;

    this.running = true;
    try {
      await this.asyncRunTask(nextId);
    } catch (e) {
      const task = this.tasks.find((t) => t.id === nextId);
      if (task) task.status = 'failed';
      console.error('Error in asyncRunTask', e);
    } finally {
      this.running = false;
      this.runNext(); // ggf. nächste URL starten
    }
  }

  // eine URL, alle configs parallel
  private async asyncRunTask(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    task.status = 'in-progress';
    const url = task.url;

    const promises: Promise<void>[] = [];

    for (let conf = 1; conf <= configLength; conf++) {
      const p = (async () => {
        const session = await this.dbService.createSession({
          url,
          configId: conf,
        });
        task.sessions.push(session.id);

        const done = await this.crawlerService.crawler(url, session.id, conf);
        if (done) {
          task.sessionsDone.push(session.id);
        }
      })();

      promises.push(p);
    }

    await Promise.all(promises);

    if (task.sessionsDone.length === task.sessions.length) {
      task.status = 'completed';
    }
  }
}
