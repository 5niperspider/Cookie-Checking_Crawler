import { Injectable } from '@nestjs/common';
import { Session } from './interfaces/session.interface';
import { randomUUID } from 'node:crypto';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
    private readonly sessions: Session[] = [];

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

  getSessions(): { sessions: Session[] } {
    return { sessions: this.sessions };
  }

  getSessionById(sessionId: string): { session: Session } | undefined {
    const session = this.sessions.find(s => s.id === sessionId);
    return {session: session};
  }
}
