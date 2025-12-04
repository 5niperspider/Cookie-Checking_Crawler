import { Injectable } from '@nestjs/common';

@Injectable()
export class CookiesService {

  getCookies(): { message: string } {
    return { message: "Here take some Cookies!" };
  }
}