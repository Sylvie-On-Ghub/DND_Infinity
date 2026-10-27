import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActionResponse } from "./client";

export function useSheetAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (run: () => Promise<ActionResponse>) => run(),
    onSuccess: (res) => {
      if (res.sheet) queryClient.setQueryData(["sheet", id], res.sheet);
      queryClient.invalidateQueries({ queryKey: ["character", id] });
      queryClient.invalidateQueries({ queryKey: ["characters"] }); // list shows level/classes
    },
  });
}