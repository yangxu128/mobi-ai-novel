/** mammoth 前端 docx 解析（动态 import，仅用 extractRawText） */
declare module "mammoth" {
  export interface MammothMessage {
    type: string;
    message: string;
  }
  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: MammothMessage[] }>;
}
