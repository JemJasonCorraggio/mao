package ws
import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/JemJasonCorraggio/mao/internal/game"
)

type Client struct {
	Conn     *websocket.Conn
	GameID   string
	PlayerID string
}

var clients = make(map[*websocket.Conn]*Client)

type ClientMessage struct {
	Type    string `json:"type"`
	GameID  string `json:"gameId,omitempty"`
	PlayerID string `json:"playerId,omitempty"`
}

type ServerMessage struct {
	Type   string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

type GameState struct {
	ID      string   `json:"id"`
	Status  string   `json:"status"`
	AdminID string   `json:"adminId"`
	Players []string `json:"players"`
}

type PlayerGameState struct {
  ID        string    `json:"id"`
  Status    string    `json:"status"`
  AdminID   string    `json:"adminId"`
  Players   []string  `json:"players"`
  Hand      []CardDTO `json:"hand"`
  PlayerID  string    `json:"playerId"`
  CurrentAction *ActionDTO `json:"currentAction,omitempty"`
}

type CardDTO struct {
	Rank string `json:"rank"`
	Suit string `json:"suit"`
}

type ActionDTO struct {
	ID        string   `json:"id"`
	PlayerID string   `json:"playerId"`
	Type      string   `json:"type"`
	Card      *CardDTO `json:"card,omitempty"`
}

type ProposePlayCardMessage struct {
	Type     string  `json:"type"` 
	GameID   string  `json:"gameId"`
	PlayerID string  `json:"playerId"`
	Card     CardDTO `json:"card"`
}

type ProposeDrawMessage struct {
	Type     string `json:"type"` 
	GameID   string `json:"gameId"`
	PlayerID string `json:"playerId"`
}

const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingInterval   = (pongWait * 9) / 10
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Handler struct {
	// Game will be injected later
}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("websocket upgrade failed: %v", err)
		return
	}

	log.Printf("websocket connected: %s", r.RemoteAddr)

	conn.SetReadDeadline(time.Now().Add(pongWait))
    conn.SetPongHandler(func(string) error {
        conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    ticker := time.NewTicker(pingInterval)
    defer ticker.Stop()

    go func() {
        for range ticker.C {
            conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := conn.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
                return
            }
        }
    }()

	defer func() {
		delete(clients, conn)
		conn.Close()
	}()

	for {
		_, messageBytes, err := conn.ReadMessage()
		if err != nil {
			return
		}

		conn.SetReadDeadline(time.Now().Add(pongWait))

		var msg ClientMessage
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("invalid message: %v", err)
			continue
		}

		switch msg.Type {
		case "CREATE_GAME":
			player := &game.Player{
			ID: "player-1",
			}

			newGame, err := game.CreateGame(player)
			if err != nil {
			log.Printf("create game failed: %v", err)
			continue
			}

			client := &Client{
				Conn:     conn,
				GameID:   newGame.ID,
				PlayerID: player.ID,
			}

			clients[conn] = client


			state := ServerMessage{
				Type: "GAME_STATE",
				Payload: toPlayerGameState(newGame, player.ID),
			}

			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteJSON(state); err != nil {
				log.Printf("write failed: %v", err)
				return
			}

		case "JOIN_GAME":
		if msg.GameID == "" {
			log.Printf("JOIN_GAME missing gameId")
			continue
		}

		player := &game.Player{
			ID: "player-2",
		}

		joinedGame, err := game.JoinGame(msg.GameID, player)
		if err != nil {
			log.Printf("join game failed: %v", err)
			continue
		}

		client := &Client{
			Conn:     conn,
			GameID:   msg.GameID,
			PlayerID: player.ID,
		}

		clients[conn] = client

		broadcastGameState(msg.GameID, joinedGame)

		case "START_GAME":
		if msg.GameID == "" || msg.PlayerID == "" {
			log.Printf("START_GAME missing gameId or playerId")
			continue
		}

		gameInstance, err := game.GetGame(msg.GameID)
		if err != nil {
			log.Printf("start game failed: %v", err)
			continue
		}

		if err := gameInstance.StartGame(msg.PlayerID); err != nil {
			log.Printf("start game failed: %v", err)
			continue
		}

		broadcastGameState(msg.GameID, gameInstance)

		case "PROPOSE_PLAY":
		var payload ProposePlayCardMessage
		if err := json.Unmarshal(messageBytes, &payload); err != nil {
			log.Printf("invalid PROPOSE_PLAY payload: %v", err)
			continue
		}

		g, err := game.GetGame(payload.GameID)
		if err != nil {
			log.Printf("game not found: %v", err)
			continue
		}

		action := &game.Action{
			ID:       time.Now().Format(time.RFC3339Nano),
			PlayerID: payload.PlayerID,
			Type:     game.ActionPlayCard,
			Card: &game.Card{
				Rank: payload.Card.Rank,
				Suit: payload.Card.Suit,
			},
		}

		if err := g.ProposeAction(action); err != nil {
			log.Printf("cannot propose action: %v", err)
			continue
		}

		broadcastGameState(payload.GameID, g)

		case "PROPOSE_DRAW":
		var payload ProposeDrawMessage
		if err := json.Unmarshal(messageBytes, &payload); err != nil {
			log.Printf("invalid PROPOSE_DRAW payload: %v", err)
			continue
		}

		g, err := game.GetGame(payload.GameID)
		if err != nil {
			log.Printf("game not found: %v", err)
			continue
		}

		action := &game.Action{
			ID:       time.Now().Format(time.RFC3339Nano),
			PlayerID: payload.PlayerID,
			Type:     game.ActionDraw,
		}

		if err := g.ProposeAction(action); err != nil {
			log.Printf("cannot propose action: %v", err)
			continue
		}

		broadcastGameState(payload.GameID, g)

		default:
			log.Printf("unknown message type: %s", msg.Type)
		}
	}
}

func toPlayerGameState(g *game.Game, playerID string) PlayerGameState {
	players := make([]string, 0, len(g.Players))
	var hand []CardDTO
	var actionDTO *ActionDTO

	if g.CurrentAction != nil {
		actionDTO = &ActionDTO{
			ID:        g.CurrentAction.ID,
			PlayerID: g.CurrentAction.PlayerID,
			Type:     string(g.CurrentAction.Type),
		}

		if g.CurrentAction.Card != nil {
			actionDTO.Card = &CardDTO{
				Rank: g.CurrentAction.Card.Rank,
				Suit: g.CurrentAction.Card.Suit,
			}
		}
	}

	for _, p := range g.Players {
		players = append(players, p.ID)

		if p.ID == playerID {
			for _, c := range p.Hand {
				hand = append(hand, CardDTO{
					Rank: c.Rank,
					Suit: c.Suit,
				})
			}
		}
	}

	return PlayerGameState{
		ID:       g.ID,
		Status:   string(g.Status),
		AdminID:  g.AdminID,
		Players:  players,
		Hand:     hand,
		PlayerID: playerID,
		CurrentAction: actionDTO,
	}

}

func broadcastGameState(gameID string, g *game.Game) {
	for _, client := range clients {
		if client.GameID != gameID {
			continue
		}

		state := ServerMessage{
			Type: "GAME_STATE",
			Payload: toPlayerGameState(g, client.PlayerID),
		}

		client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
		if err := client.Conn.WriteJSON(state); err != nil {
			log.Printf("broadcast failed to %s: %v", client.PlayerID, err)
		}
	}
}
