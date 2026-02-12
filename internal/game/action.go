package game

type ActionType string

const (
	ActionPlayCard ActionType = "PLAY_CARD"
	ActionDraw     ActionType = "DRAW"
)

type ActionResolution string

const (
	ResolutionAccept             ActionResolution = "ACCEPT"
	ResolutionAcceptWithPenalty  ActionResolution = "ACCEPT_WITH_PENALTY"
	ResolutionReject             ActionResolution = "REJECT"
)

type Action struct {
	ID            string
	PlayerID      string
	Type          ActionType
	Card          *Card

	AcceptedBy    map[string]bool
	ChallengedBy  map[string]bool

	Resolved      bool
	Resolution    ActionResolution
	ResolvedBy    string 
}


