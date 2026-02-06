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

func GetGame(gameID string) (*Game, error) {
	game, ok := games[gameID]
	if !ok {
		return nil, errors.New("game not found")
	}
	return game, nil
}

func (g *Game) StartGame(adminID string) error {
	if g.Status != GameWaiting {
		return errors.New("game already started")
	}

	if g.AdminID != adminID {
		return errors.New("only admin can start game")
	}

	g.Status = GameActive

	g.TopCard = NewRandomCard()
	g.dealInitialHands()
	// - emit/broadcast game state

	return nil
}

func (g *Game) dealInitialHands() {
	for _, p := range g.Players {
		for i := 0; i < 7; i++ {
			p.Hand = append(p.Hand, NewRandomCard())
		}
	}
}

func (g *Game) ProposeAction(a *Action) error {
	if g.Status != GameActive {
		return errors.New("game not active")
	}

	if g.CurrentAction != nil {
		return errors.New("another action is already pending")
	}

	g.CurrentAction = a
	return nil
}

func (g *Game) ClearAction() {
	g.CurrentAction = nil
}