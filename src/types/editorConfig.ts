export interface EditorConfigFileDto {
  tool: "claude_code" | "cursor" | "generic";
  label: string;
  filename: string;
  content: string;
}

export interface EditorConfigResponse {
  files: EditorConfigFileDto[];
}
