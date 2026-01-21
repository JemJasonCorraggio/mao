package ws
import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/JemJasonCorraggio/mao/internal/game"
)

type ClientMessage struct {
	Type   string `json:"type"`
	GameID string `json:"gameId,omitempty"`
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

	defer func() {
		log.Printf("websocket disconnected: %s", r.RemoteAddr)
		conn.Close()
	}()

	for {
		_, messageBytes, err := conn.ReadMessage()
		if err != nil {
			return
		}

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

			response := ServerMessage{
				Type: "GAME_CREATED",
				Payload: map[string]string{
					"gameId": newGame.ID,
				},
			}

			if err := conn.WriteJSON(response); err != nil {
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

		response := ServerMessage{
			Type:    "GAME_STATE",
			Payload: toGameState(joinedGame),
		}

		if err := conn.WriteJSON(response); err != nil {
			log.Printf("write failed: %v", err)
			return
		}

		default:
			log.Printf("unknown message type: %s", msg.Type)
		}
	}
}

func toGameState(g *game.Game) GameState {
	players := make([]string, 0, len(g.Players))
	for _, p := range g.Players {
		players = append(players, p.ID)
	}

	return GameState{
		ID:      g.ID,
		Status:  string(g.Status),
		AdminID: g.AdminID,
		Players: players,
	}
}
