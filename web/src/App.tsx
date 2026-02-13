import { useState } from "react";
import { useGameSocket } from "./useGameSocket";
import type { PlayerGameState, CardDTO, ActionDTO, OutgoingMessage, Event } from "./types";

const formatPendingDescription = (action?: ActionDTO | null) => {
  if (!action) return null;

  if (action.type === "PLAY_CARD") {
    if (action.card) {
      return (
        <>
          {action.playerId} proposed to play <strong>{action.card.rank} of {action.card.suit}</strong> 🎴
        </>
      );
    }
  }

  if (action.type === "DRAW") {
    return (
      <>
        {action.playerId} requested to <strong>draw</strong> a card 🃏
      </>
    );
  }

  return (
    <>
      {action.playerId} — {action.type}
    </>
  );
};

const suitSymbol = (s: string) => {
  const sLower = (s || "").toLowerCase();
  if (sLower.includes("heart")) return "♥";
  if (sLower.includes("diamond")) return "♦";
  if (sLower.includes("club")) return "♣";
  if (sLower.includes("spade")) return "♠";
  return s;
};

const suitColor = (s: string) => {
  const sLower = (s || "").toLowerCase();
  if (sLower.includes("heart") || sLower.includes("diamond")) return "red";
  return "#000";
};

function CardView({ card, onClick, small }: { card: CardDTO; onClick?: () => void; small?: boolean }) {
  const width = small ? 88 : 140;
  const height = small ? 120 : 180;
  const fontSize = small ? "0.9em" : "1.1em";

  const color = suitColor(card?.suit);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width,
        height,
        borderRadius: 8,
        border: "1px solid #333",
        background: "#fff",
        color,
        padding: 8,
        margin: 6,
        display: "inline-flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ alignSelf: "flex-start", fontSize }}>{card.rank}</div>
      <div style={{ fontSize: small ? "1.2em" : "1.6em" }}>{suitSymbol(card.suit)}</div>
      <div style={{ alignSelf: "flex-end", fontSize }}>{card.rank}</div>
    </button>
  );
}

function RecentEventsFeed({ events }: { events?: Event[] }) {
  if (!events || events.length === 0) return null;

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, marginTop: 12 }}>
      <strong>Recent Events</strong>
      <ul style={{ marginTop: 8, paddingLeft: 20, margin: "8px 0 0 0" }}>
        {events.slice().reverse().map((e, i) => (
          <li key={i} style={{ marginBottom: 8, fontSize: "0.95em" }}>
            {e.type === "PENALTY" && (
              <span style={{ color: "#b00020" }}>
                ⚠️ Penalty: <strong>{e.playerId}</strong> +{e.penalty}
              </span>
            )}
            {e.type === "ACTION" && e.actionType === "PLAY_CARD" && e.card && (
              <span>
                🎴 <strong>{e.playerId}</strong> played {e.card.rank} of {e.card.suit}
              </span>
            )}
            {e.type === "ACTION" && e.actionType === "DRAW" && (
              <span>
                🃏 <strong>{e.playerId}</strong> drew a card
              </span>
            )}
            {e.type === "ACTION" && e.actionType === "START_GAME" && (
              <span>🎩 Game started</span>
            )}
            {e.timestamp && (
              <span style={{ marginLeft: 8, fontSize: "0.9em" }}>
                {new Date(e.timestamp * 1000).toLocaleTimeString()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const { connect, send, gameState, connected } = useGameSocket();
  const [gameId, setGameId] = useState("");
  const [name, setName] = useState("");

  return (
    <div style={{ padding: "20px" }}>
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
            onChange={(e) => setGameId(e.target.value.toUpperCase())}
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

function GameView({ game, send }: { game: PlayerGameState; send: (msg: OutgoingMessage) => void }) {
  const isAdmin = game.playerId === game.adminId;
  const canStart = game.status === "WAITING";
  const isActive = game.status === "ACTIVE";
  const isEnded = game.status === "ENDED";
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

      {isEnded && game.winnerId && (
        <div
          style={{
            border: "2px solid green",
            padding: 12,
            marginBottom: 16,
          }}
        >
          <h2 style={{ color: "green", margin: 0 }}>🎉 Game Over</h2>
          <div style={{ fontSize: "1.2em", marginTop: 8 }}>
            Winner: <strong>{game.winnerId}</strong>
          </div>
        </div>
      )}

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

      <h3>Seating Order</h3>
        <div style={{ marginBottom: 12, fontStyle: "italic" }}>
          {game.lastAction ? (
            <>
              {game.lastAction.playerId}{" "}
              {game.lastAction.type === "PLAY_CARD"
                ? " played a card 🎴"
                : " drew a card 🃏"}
            </>
          ) : isActive ? (
            <>Dealer dealt the cards 🎩</>
          ) : (
            <>Waiting to start…</>
          )}
        </div>

        <ol style={{ paddingLeft: 20 }}>
          {(game.players ?? []).map((p, index) => {
              const isDealer = p.id === game.adminId;
              const isWinner = p.id === game.winnerId;
              const isLastActor = p.id === game.lastAction?.playerId;
              const isYou = p.id === game.playerId;

              return (
                <li
                  key={p.id}
                  style={{
                    marginBottom: 6,
                    fontWeight: isWinner ? "bold" : "normal",
                    background: isLastActor ? "#008000" : "transparent",
                    padding: 4,
                    borderRadius: 4,
                  }}
                >
                  {isLastActor && <span style={{ marginRight: 6 }}>➤</span>}

                  {p.id} <span style={{ marginLeft: 8}}>({p.handCount})</span>

                  {isYou && " (You 👤)"}
                  {isDealer && " 🎩 Dealer"}
                  {isWinner && " 🏆"}
                </li>
              );
            })}
        </ol>

      <RecentEventsFeed events={game.recentEvents} />

      {isAdmin && isActive && (
        <div style={{ marginTop: 16 }}>
          <h3>Admin Penalties</h3>

          {(game.players ?? []).map((p) => (
            <button
              key={p.id}
              style={{ marginRight: 8, marginBottom: 4 }}
              onClick={() =>
                send({
                  type: "ADMIN_PENALIZE",
                  gameId: game.id,
                  targetPlayerId: p.id,
                  penaltyCount: 1,
                })
              }
            >
              Penalize {p.id}
            </button>
          ))}
        </div>
      )}

      {isActive && action && (
        <div style={{ border: "1px solid #e53935", padding: 12, marginBottom: 12, borderRadius: 6 }}>
          <div style={{ fontSize: "1em", marginBottom: 8 }}><strong>Pending Action</strong></div>

          <div style={{ marginBottom: 8 }}>{formatPendingDescription(action)}</div>

          {action.type === "PLAY_CARD" && action.card && (
            <div style={{ marginTop: 8 }}>
              <CardView card={action.card} small />
            </div>
          )}

          <div style={{ marginBottom: 6, color: "#333" }}>
            <strong>Challenges</strong>: {challengedBy.length > 0 ? challengedBy.join(", ") : "None"} {challengedBy.length > 0 ? "⚠️" : ""}
          </div>

          <div style={{ marginBottom: 8, color: "#333" }}>
            <strong>Accepts</strong>: {acceptedBy.length > 0 ? acceptedBy.join(", ") : "None"} {acceptedBy.length > 0 ? "✅" : ""}
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
          {isAdmin && (
            <div style={{ marginTop: 12, borderTop: "1px dashed #999", paddingTop: 8 }}>
              <strong>Admin Resolution</strong>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() =>
                    send({
                      type: "RESOLVE_ACTION",
                      gameId: game.id,
                      resolution: "ACCEPT",
                    })
                  }
                >
                  Accept
                </button>

                <button
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    send({
                      type: "RESOLVE_ACTION",
                      gameId: game.id,
                      resolution: "ACCEPT_WITH_PENALTY",
                      penaltyCount: 1,
                    })
                  }
                >
                  Accept + Penalty
                </button>

                <button
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    send({
                      type: "RESOLVE_ACTION",
                      gameId: game.id,
                      resolution: "REJECT",
                      penaltyCount: 1,
                    })
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {!canReact && !isMyAction && (
            <div style={{ marginTop: 8, fontStyle: "italic" }}>
              You have already responded
            </div>
          )}
        </div>
      )}

      {isActive && action && !isAdmin && (
        <div style={{ fontStyle: "italic", marginTop: 8 }}>
          Waiting for admin to resolve…
        </div>
      )}

      {game.topCard && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8, color: "#fff" }}><strong>Top Card 🎴</strong></div>
          <CardView card={game.topCard} />
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
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
        {(game.hand ?? []).map((c: CardDTO, i: number) => (
          <CardView
            key={i}
            small
            card={c}
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
          />
        ))}
      </div>
    </div>)}
    </div>
  );
}

export default App;
