
export type AspectRatio = "1:1" | "9:16" | "16:9";

export interface ReferenceImage {
  id: string;
  file: File;
  base64: string;
}

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}
