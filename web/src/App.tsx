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

          <button disabled={!name}
            onClick={() =>
              send(
                gameId
                  ? {
                      type: "JOIN_GAME",
                      gameId,
                      name,
                    }
                  : {
                      type: "CREATE_GAME",
                      name,
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
  const action = game.currentAction;
  const isMyAction = action?.playerId === game.playerId;

  const acceptedBy = action?.acceptedBy ?? [];
  const challengedBy = action?.challengedBy ?? [];

  const hasAccepted = acceptedBy.includes(game.playerId);
  const hasChallenged = challengedBy.includes(game.playerId);

  const canReact =
    !!action &&
    !isMyAction &&
    !hasAccepted &&
    !hasChallenged;

  return (
    <div>
      <h2>Game {game.id}</h2>

      {isAdmin && canStart && (
        <button
          onClick={() =>
            send({
              type: "START_GAME",
              gameId: game.id,
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

      {action && (
        <div style={{ border: "1px solid red", padding: 8, marginBottom: 12 }}>
          <strong>Pending Action</strong>

          <div>Player: {action.playerId}</div>
          <div>Type: {action.type}</div>

          {action.card && (
            <div>
              Card: {action.card.rank} of {action.card.suit}
            </div>
          )}

          <div>
            <strong>Challenges:</strong>{" "}
            {challengedBy.length > 0
              ? challengedBy.join(", ")
              : "None"}
          </div>

          <div>
            <strong>Accepts:</strong>{" "}
            {acceptedBy.length > 0
              ? acceptedBy.join(", ")
              : "None"}
          </div>

          {canReact && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() =>
                  send({
                    type: "ACCEPT_ACTION",
                    gameId: game.id,
                  })
                }
              >
                Accept
              </button>

              <button
                style={{ marginLeft: 8 }}
                onClick={() =>
                  send({
                    type: "CHALLENGE_ACTION",
                    gameId: game.id,
                  })
                }
              >
                Challenge
              </button>
            </div>
          )}

          {!canReact && !isMyAction && (
            <div style={{ marginTop: 8, fontStyle: "italic" }}>
              You have already responded
            </div>
          )}
        </div> 
      )}

      {isActive && (<div>
        <button
        disabled={!!game.currentAction}
        title={game.currentAction ? "Action pending resolution" : ""}
        onClick={() =>
          send({
            type: "PROPOSE_DRAW",
            gameId: game.id,
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
