import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreateSessionDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
