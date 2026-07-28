export interface HandsOnFile {
  path: string;
  content: string;
}

export interface HandsOnCodeDto {
  language: string;
  isWebPlayable: boolean;
  description: string;
  files: HandsOnFile[];
  runInstructions: string;
}

export interface HandsOnResponse {
  code: HandsOnCodeDto;
  sandboxUrl: string | null;
}
