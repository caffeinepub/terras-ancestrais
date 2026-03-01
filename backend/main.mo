import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

actor {
  type GameSession = {
    id : Text;
    owner : Principal;
    territoryOwnership : Map.Map<Text, Principal>;
    unitPositions : Map.Map<Text, Principal>;
  };

  type GameSessionView = {
    id : Text;
    owner : Principal;
    territoryOwnership : [(Text, Principal)];
    unitPositions : [(Text, Principal)];
  };

  let gameSessions = Map.empty<Text, GameSession>();

  func toGameSessionView(gameSession : GameSession) : GameSessionView {
    {
      gameSession with
      territoryOwnership = gameSession.territoryOwnership.toArray();
      unitPositions = gameSession.unitPositions.toArray();
    };
  };

  public shared ({ caller }) func createGameSession(id : Text) : async () {
    if (gameSessions.containsKey(id)) {
      Runtime.trap("Game with provided id is already running. ");
    };

    let newGameSession = {
      id;
      owner = caller;
      territoryOwnership = Map.empty<Text, Principal>();
      unitPositions = Map.empty<Text, Principal>();
    };

    gameSessions.add(id, newGameSession);
  };

  public query ({ caller }) func getGameSession(id : Text) : async GameSessionView {
    switch (gameSessions.get(id)) {
      case (null) { Runtime.trap("Game session not found!") };
      case (?gameSession) { toGameSessionView(gameSession) };
    };
  };

  public shared ({ caller }) func updateTerritoryOwnership(gameId : Text, territoryId : Text) : async () {
    switch (gameSessions.get(gameId)) {
      case (null) { Runtime.trap("Game session not found!") };
      case (?gameSession) {
        assert (caller == gameSession.owner);

        gameSession.territoryOwnership.add(territoryId, caller);
      };
    };
  };

  public shared ({ caller }) func updateUnitPosition(gameId : Text, unitId : Text) : async () {
    switch (gameSessions.get(gameId)) {
      case (null) { Runtime.trap("Game session not found!") };
      case (?gameSession) {
        assert (caller == gameSession.owner);

        gameSession.unitPositions.add(unitId, caller);
      };
    };
  };

  public query ({ caller }) func getAllGameSessions() : async [GameSessionView] {
    gameSessions.values().toArray().map<GameSession, GameSessionView>(toGameSessionView);
  };
};
