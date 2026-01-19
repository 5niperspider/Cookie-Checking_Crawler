import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DbService } from '../db/db.service';
import { CrawlerService } from '../crawler.service';

// Anzahl der verschiedenen Konfigurationen
const configLength = 18;

type TaskStatus = 'scheduled' | 'in-progress' | 'completed' | 'failed';

// Service zum Verwalten von Crawling-Aufgaben
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

  // Neue Aufgaben hinzufügen
  addTasks(urls: string[]) {
    const ids: string[] = [];

    // Für jede URL eine neue Aufgabe erstellen
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

  // Status einer Aufgabe abfragen
  getStatus(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    return { id, url: task.url, status: task.status };
  }

  //
  private async runNext() {
    if (this.running || this.queue.length === 0) return;

    // nächste ID aus der Queue holen
    const nextId = this.queue.shift();
    if (!nextId) return;

    // Aufgabe ausführen
    this.running = true;
    try {
      await this.asyncRunTask(nextId);
    } catch (e) {
      // Bei Fehler den Task auf 'failed' setzen
      const task = this.tasks.find((t) => t.id === nextId);
      if (task) task.status = 'failed';
      console.error('Error in asyncRunTask', e);
    } finally {
      // Task beendet
      this.running = false;
      this.runNext();
    }
  }

  // Asynchrone Ausführung einer Aufgabe
  private async asyncRunTask(id: string) {
    //  Task anhand der ID finden
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    task.status = 'in-progress';
    const url = task.url;

    const promises: Promise<void>[] = [];

    // Für jede Konfiguration eine Session erstellen und den Crawler starten
    for (let conf = 1; conf <= configLength; conf++) {
      const p = (async () => {
        // Neue Session in der Datenbank erstellen
        const session = await this.dbService.createSession({
          url,
          configId: conf,
        });
        task.sessions.push(session.id);

        // Crawler mit der jeweiligen Konfiguration ausführen
        const done = await this.crawlerService.crawler(url, session.id, conf);
        if (done) {
          task.sessionsDone.push(session.id);
        }
      })();

      promises.push(p);
    }

    // Alle Sessions abwarten
    await Promise.all(promises);

    // Task als abgeschlossen markieren, wenn alle Sessions erledigt sind
    if (task.sessionsDone.length === task.sessions.length) {
      task.status = 'completed';
    }
  }
}
