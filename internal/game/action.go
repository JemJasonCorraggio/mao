package game

type ActionType string

const (
	ActionPlayCard ActionType = "PLAY_CARD"
	ActionDraw     ActionType = "DRAW"
)

type Action struct {
	ID           string
	PlayerID    string
	Type         ActionType
	Card         *Card     
	AcceptedBy   map[string]bool
	ChallengedBy map[string]bool 
}
