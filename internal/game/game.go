package game

type GameStatus string

const (
	GameWaiting GameStatus = "WAITING"
	GameActive  GameStatus = "ACTIVE"
	GameEnded   GameStatus = "ENDED"
)

type Game struct {
	ID            string
	Status        GameStatus
	Players       []*Player
	AdminID       string
	CurrentAction *Action
	TopCard   	  *Card
}
