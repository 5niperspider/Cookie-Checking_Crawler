import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionsService {

  getSessions() {
    return { message: "Endpoint not implemented atm"};
  }

  getSessionById(sessionId: string) {
    return { message: "Endpoint not implemented atm"};
  }
}
