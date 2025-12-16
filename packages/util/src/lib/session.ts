export class Session {
    url!: string;
}

export interface ISession {
  id: string;
  url: string;
  created_at: Date;
  status: string;
}