import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameSessionView } from "../backend";
import { useActor } from "./useActor";

export function useGetGameSession(id: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<GameSessionView | null>({
    queryKey: ["gameSession", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      try {
        return await actor.getGameSession(id);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
    refetchInterval: 3000,
  });
}

export function useCreateGameSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.createGameSession(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameSession"] });
    },
  });
}

export function useUpdateTerritoryOwnership() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      territoryId,
    }: { gameId: string; territoryId: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateTerritoryOwnership(gameId, territoryId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["gameSession", variables.gameId],
      });
    },
  });
}

export function useUpdateUnitPosition() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      unitId,
    }: { gameId: string; unitId: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateUnitPosition(gameId, unitId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["gameSession", variables.gameId],
      });
    },
  });
}
