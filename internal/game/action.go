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
	Card         *Card      // nil for DRAW
	ChallengedBy []string   // player IDs
}
