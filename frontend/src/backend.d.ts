import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface GameSessionView {
    id: string;
    territoryOwnership: Array<[string, Principal]>;
    owner: Principal;
    unitPositions: Array<[string, Principal]>;
}
export interface backendInterface {
    createGameSession(id: string): Promise<void>;
    getAllGameSessions(): Promise<Array<GameSessionView>>;
    getGameSession(id: string): Promise<GameSessionView>;
    updateTerritoryOwnership(gameId: string, territoryId: string): Promise<void>;
    updateUnitPosition(gameId: string, unitId: string): Promise<void>;
}
