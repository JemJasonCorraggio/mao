package game

import (
	"errors"
	"math/rand"
	"strings"
	"time"
)

type GameStatus string

const (
	GameWaiting GameStatus = "WAITING"
	GameActive  GameStatus = "ACTIVE"
	GameEnded   GameStatus = "ENDED"
)

var games = make(map[string]*Game)

type Game struct {
	ID            string
	Status        GameStatus
	Players       []*Player
	AdminID       string
	CurrentAction *Action
	TopCard   	  *Card
}

const gameCodeLength = 4
const gameCodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

func generateGameCode() string {
	rand.Seed(time.Now().UnixNano())

	var b strings.Builder
	for i := 0; i < gameCodeLength; i++ {
		b.WriteByte(gameCodeAlphabet[rand.Intn(len(gameCodeAlphabet))])
	}
	return b.String()
}

func CreateGame(adminPlayer *Player) (*Game, error) {
	if adminPlayer == nil {
		return nil, errors.New("admin player cannot be nil")
	}

	var gameID string
	for {
		gameID = generateGameCode()
		if _, exists := games[gameID]; !exists {
			break
		}
	}

	game := &Game{
		ID:      gameID,
		Status:  GameWaiting,
		Players: []*Player{adminPlayer},
		AdminID: adminPlayer.ID,
	}

	// Store in memory
	games[gameID] = game

	return game, nil
}

func JoinGame(gameID string, player *Player) (*Game, error) {
	if player == nil {
		return nil, errors.New("player cannot be nil")
	}

	game, exists := games[gameID]
	if !exists {
		return nil, errors.New("game not found")
	}

	if game.Status != GameWaiting {
		return nil, errors.New("game already started")
	}

	for _, p := range game.Players {
		if p.ID == player.ID {
			return nil, errors.New("player already in game")
		}
	}

	game.Players = append(game.Players, player)

	return game, nil
}
