import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchCharacter } from "./characters";
import type { Character } from "./client";

export function useCharacterPatch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Character) => patchCharacter(id, body),
    onSuccess: (character) => {
      queryClient.setQueryData(["character", id], character);
      // the response has no sheet, so refetch it (AC, max HP, modifiers…)
      queryClient.invalidateQueries({ queryKey: ["sheet", id] });
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}