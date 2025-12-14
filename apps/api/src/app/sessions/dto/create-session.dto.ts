import { IsArray, IsNotEmpty, IsUrl } from 'class-validator';

export class CreateSessionDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsArray()
  config: number[];
}
