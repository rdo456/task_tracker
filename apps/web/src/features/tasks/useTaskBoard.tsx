import { CreateTaskInput, Task, UpdateTaskInput } from "@jira-lite/shared";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useToast } from "../../toast";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  archiveTask,
} from "./api";
import { useTaskEvents } from "./useTaskEvents";

type UseTaskBoards = {
  tasks: Task[];
  isLoading: boolean;
  isMutation: boolean;
  initialLoadFailed: boolean;
  create: (input: CreateTaskInput) => void;
  update: (args: { id: string; input: UpdateTaskInput }) => void;
  remove: (id: string) => void;
  archive: (id: string) => void;
};

export default function useTaskBoards(): UseTaskBoards {
  const queryClient = useQueryClient();
  const toast = useToast();
  useTaskEvents();

  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });

  // Toast on background refetch failure (we already have data, so keep the board visible).
  const lastErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (error && tasks && error !== lastErrorRef.current) {
      toast(`Failed to refresh tasks: ${(error as Error).message}`, "error");
    }
    lastErrorRef.current = error;
  }, [error, tasks, toast]);

  const { mutate: create, isPending: isPendingCreate } = useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) => [
        ...(old ?? []),
        newTask,
      ]);
    },
    onError: (err) => toast(`Create failed: ${err.message}`, "error"),
  });

  const { mutate: update, isPending: isPendingUpdate } = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).map((t) => (t.id === updated.id ? updated : t)),
      );
    },
    onError: (err) => toast(`Update failed: ${err.message}`, "error"),
  });

  const { mutate: remove, isPending: isPendingDelete } = useMutation({
    mutationFn: deleteTask,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
    },
    onError: (err) => toast(`Delete failed: ${err.message}`, "error"),
  });

  const { mutate: archive, isPending: isPendingArchive } = useMutation({
    mutationFn: archiveTask,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
    },
    onError: (err) => toast(`Archive failed: ${err.message}`, "error"),
  });

  const isMutation =
    isPendingCreate || isPendingUpdate || isPendingDelete || isPendingArchive;
  return {
    tasks: tasks ?? [],
    isLoading: isLoading || isMutation,
    isMutation,
    initialLoadFailed: !!error && !tasks,
    create,
    update,
    remove,
    archive,
  };
}
