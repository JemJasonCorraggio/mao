package game

type Player struct {
	ID       string
	Name     string
	Seat     int
	IsAdmin  bool
	Hand     []*Card
}
