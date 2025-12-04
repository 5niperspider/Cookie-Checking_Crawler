import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateSessionDto } from './dto/create-session.dto';
import { ISession } from '@cccrawler/util';

@Injectable()
export class SessionsService {
    private readonly sessions: ISession[] = [];

  create(msg: CreateSessionDto) {
    if(!msg.url) {
        throw new Error("URL is required to create a session");
    }
    const newSession = {
      id: randomUUID(),
      url: msg.url,
      created_at: new Date(),
      status: "created",
    }

    this.sessions.push(newSession);
    return newSession;
  }

  getSessions(): { sessions: ISession[] } {
    return { sessions: this.sessions };
  }

  getSessionById(sessionId: string): { session: ISession } | undefined {
    const session = this.sessions.find(s => s.id === sessionId);
    return {session: session};
  }
}
