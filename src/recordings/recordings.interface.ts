export interface Recording {
  id: string;
  fileName: string;
  file: Express.Multer.File;
}

export type Recordings = Record<string, Recording>;
