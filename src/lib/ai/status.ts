import { jevConfig } from "./jev";
import { llmConfig } from "./llm";

export interface AIStatus {
  jev: boolean;
  llm: boolean;
  label: string;
}

export function aiStatus(): AIStatus {
  const jev = jevConfig() !== null;
  const llm = llmConfig() !== null;
  const label = jev && llm ? "Jev + LLM judge" : jev ? "Jev judge" : llm ? "LLM judge" : "Offline judge";
  return { jev, llm, label };
}
