import { z } from 'zod';

export type Provider = 'groq' | 'openrouter' | 'gemini';

export const SearchReplaceSchema = z.object({
  search: z.string().min(1, "Campo 'search' não pode ser vazio"),
  replace: z.string()
});

export const ModificationSchema = z.object({
  filePath: z.string().min(1, "filePath é obrigatório"),
  searchReplace: z.array(SearchReplaceSchema)
});

export const AgentResponseSchema = z.object({
  reasoning: z.string().describe("Breve explicação da ação ou análise"),
  action: z.enum(['READ', 'MODIFY']).describe("Ação deve ser READ ou MODIFY. CREATE é proibido."),
  analysis: z.string().optional().describe("Resultado da análise quando action é READ"),
  modifications: z.array(ModificationSchema).optional().describe("Lista de modificações quando action é MODIFY")
}).refine(
  (data) => {
    // Se MODIFY, modifications é obrigatório
    if (data.action === 'MODIFY') {
      return data.modifications && data.modifications.length > 0;
    }
    return true;
  },
  {
    message: "Quando action é MODIFY, deve haver pelo menos uma modificação",
    path: ["modifications"]
  }
);

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type Modification = z.infer<typeof ModificationSchema>;
export type SearchReplace = z.infer<typeof SearchReplaceSchema>;