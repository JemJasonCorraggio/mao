import { useState } from "react";
import { useGameSocket } from "./useGameSocket";

function App() {
  const { connect, send, gameState, connected } = useGameSocket();
  const [gameId, setGameId] = useState("");
  const [name, setName] = useState("");
  const activeGameId = gameState?.id;

  return (
    <div>
      <h1>Mao</h1>

      {!connected && (
        <button onClick={connect}>Connect</button>
      )}

      {connected && !gameState && (
        <div>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            placeholder="Game ID (blank to create)"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />

          <button
            onClick={() =>
              send(
                gameId
                  ? {
                      type: "JOIN_GAME",
                      gameId,
                    }
                  : {
                      type: "CREATE_GAME",
                    }
              )
            }
          >
            {gameId ? "Join Game" : "Create Game"}
          </button>
        </div>
      )}

      {gameState && <GameView game={gameState} send={send} />}
    </div>
  );
}

function GameView({ game, send }: { game: any; send: (msg: any) => void }) {
  const isAdmin = game.playerId === game.adminId;
  const canStart = game.status === "WAITING";
  return (
    <div>
      <h2>Game {game.id}</h2>

      {isAdmin && canStart && (
        <button
          onClick={() =>
            send({
              type: "START_GAME",
              gameId: game.id,
              playerId: game.playerId,
            })
          }
        >
          Start Game
        </button>
      )}

      <h3>Players</h3>
      <ul>
        {(game.players ?? []).map((p: string) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h3>Your Hand</h3>
      <ul>
        {(game.hand ?? []).map((c: any, i: number) => (
          <li key={i}>
            {c.rank} of {c.suit}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
