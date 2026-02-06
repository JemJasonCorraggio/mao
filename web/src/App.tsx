import { useState } from "react";
import { useGameSocket } from "./useGameSocket";

function App() {
  const { connect, send, gameState, connected } = useGameSocket();
  const [gameId, setGameId] = useState("");
  const [name, setName] = useState("");

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
  const isActive = game.status === "ACTIVE";
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

      {game.currentAction && (
        <div style={{ border: "1px solid red", padding: 8, marginBottom: 12 }}>
          <strong>Pending Action</strong>
          <div>Player: {game.currentAction.playerId}</div>
          <div>Type: {game.currentAction.type}</div>
          {game.currentAction.card && (
            <div>
              Card: {game.currentAction.card.rank} of{" "}
              {game.currentAction.card.suit}
            </div>
          )}
        </div>
      )}

      {isActive && (<div>
        <button
        disabled={!!game.currentAction}
        onClick={() =>
          send({
            type: "PROPOSE_DRAW",
            gameId: game.id,
            playerId: game.playerId,
          })
        }
      >
        Request Draw
      </button>

      <h3>Your Hand</h3>
      <ul>
        {(game.hand ?? []).map((c: any, i: number) => (
          <li key={i}>
            <button
              disabled={!!game.currentAction}
              onClick={() =>
                send({
                  type: "PROPOSE_PLAY",
                  gameId: game.id,
                  playerId: game.playerId,
                  card: {
                    rank: c.rank,
                    suit: c.suit,
                  },
                })
              }
            >
              Play {c.rank} of {c.suit}
            </button>
          </li>
        ))}
      </ul>
    </div>)}
    </div>
  );
}

export default App;
