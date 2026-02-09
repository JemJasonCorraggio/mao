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

func (g *Game) AcceptAction(playerID string) error {
	if g.CurrentAction == nil {
		return errors.New("no current action")
	}

	if playerID == g.CurrentAction.PlayerID {
		return errors.New("cannot accept your own action")
	}

	if g.CurrentAction.ChallengedBy[playerID] {
		return errors.New("already challenged")
	}

	g.CurrentAction.AcceptedBy[playerID] = true
	return nil
}

func (g *Game) ChallengeAction(playerID string) error {
	if g.CurrentAction == nil {
		return errors.New("no current action")
	}

	if playerID == g.CurrentAction.PlayerID {
		return errors.New("cannot challenge your own action")
	}

	if g.CurrentAction.AcceptedBy[playerID] {
		return errors.New("already accepted")
	}

	g.CurrentAction.ChallengedBy[playerID] = true
	return nil
}

func (g *Game) ResolveAction(
	adminID string,
	resolution ActionResolution,
	penaltyCount int,
) error {
	if g.Status != GameActive {
		return errors.New("game not active")
	}

	if g.CurrentAction == nil {
		return errors.New("no current action")
	}

	if g.AdminID != adminID {
		return errors.New("only admin can resolve actions")
	}

	if g.CurrentAction.Resolved {
		return errors.New("action already resolved")
	}

	switch resolution{
	case ResolutionAccept:
		if err := g.acceptAction(g.CurrentAction.PlayerID); err != nil {
			return err
		}
		for playerID := range g.CurrentAction.ChallengedBy {
			if err := g.ApplyPenalty(playerID, 1); err != nil {
				return err
			}
		}
	case ResolutionAcceptWithPenalty:
		if err := g.acceptAction(g.CurrentAction.PlayerID); err != nil {
			return err
		}
		if err := g.ApplyPenalty(g.CurrentAction.PlayerID, penaltyCount); err != nil {
			return err
		}
	case ResolutionReject:
		if err := g.ApplyPenalty(g.CurrentAction.PlayerID, penaltyCount); err != nil {
			return err
		}
	default:
		return errors.New("invalid resolution")
	}

	g.CurrentAction.Resolved = true
	g.CurrentAction.Resolution = resolution
	g.CurrentAction.ResolvedBy = adminID

	g.checkForWin()
	g.ClearAction()

	return nil
}

func (g *Game) checkForWin() {
	for _, p := range g.Players {
		if len(p.Hand) == 0 {
			g.Status = GameEnded
			// later: emit GameWon event
		}
	}
}

func (g *Game) findPlayer(id string) (*Player, error) {
	for _, p := range g.Players {
		if p.ID == id {
			return p, nil
		}
	}
	return nil, errors.New("player not found")
}

func (g *Game) acceptAction(playerID string) error {
	switch g.CurrentAction.Type {
	case ActionPlayCard:
		g.TopCard = g.CurrentAction.Card
		if err := g.removeCardFromHand(playerID, *g.CurrentAction.Card); err != nil {
			return err
		}
	case ActionDraw:
		p, err := g.findPlayer(playerID)
		if err != nil {
			return err
		}
		p.Hand = append(p.Hand, NewRandomCard())
	default:
		return errors.New("unsupported action type")
	}
	return nil
}

func (g *Game) ApplyPenalty(playerID string, count int) error {
	p, err := g.findPlayer(playerID)
	if err != nil {
		return err
	}

	for i := 0; i < count; i++ {
		p.Hand = append(p.Hand, NewRandomCard())
	}
	return nil
}

func (g *Game) removeCardFromHand(playerID string, card Card) error{
	p, err := g.findPlayer(playerID)
	if err != nil {
		return  err
	}
	hand := p.Hand
	for i, c := range hand {
		if c.Rank == card.Rank && c.Suit == card.Suit {
			p.Hand = append(hand[:i], hand[i+1:]...)
			return nil
		}
	}
	return errors.New("card not found in hand")
}