package ws
import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
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

	defer func() {
		log.Printf("websocket disconnected: %s", r.RemoteAddr)
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			return
		}
	}
}
