package main

import (
	"log"
	"net/http"

	"github.com/JemJasonCorraggio/mao/internal/transport/ws"
)

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte("ok"))
	})

	wsHandler := ws.NewHandler()

	http.HandleFunc("/ws", wsHandler.Handle)

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
