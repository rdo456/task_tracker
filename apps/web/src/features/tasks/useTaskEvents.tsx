import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useTaskEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const es = new EventSource("/api/tasks/events");
    es.addEventListener("task", () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    });
    return () => es.close();
  }, [queryClient]);
}
