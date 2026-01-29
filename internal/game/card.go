package game

import "math/rand"

var ranks = []string{
	"A", "2", "3", "4", "5", "6", "7",
	"8", "9", "10", "J", "Q", "K",
}

var suits = []string{
	"hearts",
	"diamonds",
	"clubs",
	"spades",
}

type Card struct {
	Rank string 
	Suit string 
}

func NewRandomCard() *Card {
	return &Card{
		Rank: randomRank(),
		Suit: randomSuit(),
	}
}

func randomRank() string {
	return ranks[rand.Intn(len(ranks))]
}

func randomSuit() string {
	return suits[rand.Intn(len(suits))]
}