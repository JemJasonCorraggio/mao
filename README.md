# Mao App

A rule-agnostic, multiplayer, infinite-deck, implementation of the card game **Mao**, built with a Go backend and a React frontend.

---

## What Is Mao?

The first rule of Mao is that you cannot be told the rest of the rules.

Mao is a card game played with at least one experienced player who knows the rule set. Other players must infer the rules through trial and error. Rules vary widely between groups and may evolve over time. Breaking a rule results in a penalty, typically drawing a card, but the rule itself is never explained.

Because rule sets differ and may change mid-game, this application does not encode any Mao rules. Instead, it provides a structured framework for proposing actions, challenging them, and adjudicating outcomes.

---

## Project Overview

This application provides:

- Authoritative backend state management
- Real-time multiplayer synchronization over WebSockets
- Rule-agnostic event modeling
- Clear separation of transport and game logic
- A flexible foundation that supports evolving rule sets

---

## Architecture Overview

Player Browser (React)
        |
        |  WebSocket + REST
        |
Game Server (Go)
        |
        |  Delegates state transitions
        |
Game State Manager (Rule-Agnostic)
    • Hands
    • Seating Order
    • Proposed Actions
    • Challenges
    • Admin Decisions
    • Penalties
    • Recent Events

---

### Key Design Decisions

- Single authoritative Go backend
- In-memory game state for the MVP
- WebSocket-driven state updates
- Full game state broadcast on change
- No rule enforcement in code
- Rolling event feed for transparency without encoding rules

The Game State Manager contains no HTTP or WebSocket logic and has no knowledge of Mao rules. It tracks only observable game events.

---

## Infinite Deck Design

The game uses an infinite deck model. Mao is often played with multiple decks, so this just extends that idea to it's natural conclusion.

Cards are generated independently and are not removed from a shared deck. Multiple players may hold identical cards at the same time. There is no shuffling and no limit to the number of players based on deck size.

This approach simplifies state management and ensures that the game can scale to any reasonable number of participants without deck exhaustion. 

---

## Game Flow

### Game Setup

- A player creates a game and receives a four letter game code.
- Additional players join before the game starts.
- The creator becomes the admin, who acts as the dealer.
- When started:
  - Each player is dealt 7 cards.
  - A starting card is generated.
  - Seating order is determined by join order.

---

### Playing the Game

At any time, a player may:

- Propose playing a card
- Request to draw a card

Other players may:

- Accept the action
- Challenge the action

If there is a challenge, the admin resolves the action by:

- Accepting
- Accepting with penalty
- Rejecting

The admin may also apply penalties at any time, independent of a proposed action.

---

## Seating and Context

The application displays:

- Seating order
- Dealer indicator
- Current hand counts
- Last successful action
- A rolling recent event feed

Turn order is not enforced. Players infer timing and legality based on observable events, preserving the spirit of Mao.

---

## Rule-Agnostic Design

This system intentionally avoids encoding:

- Valid card matching logic
- Turn enforcement
- Speech requirements
- Conditional rule triggers

Instead, the backend models:

- Proposed actions
- Challenges
- Administrative decisions
- Penalties
- Game-winning condition when a player has zero cards

This allows any Mao rule set, including evolving or intentionally opaque ones, to function without modifying code.

---

## Definition of Done

The project is complete when:

- A user can create a game
- At least three players can join
- The game deals 7 cards to each player
- Players can propose play or draw actions
- Players can challenge actions
- The admin can resolve actions and apply penalties
- The admin can penalize any player at any time
- The game declares a winner when a player has zero cards

---

## Technical Stack

**Backend**
- Go
- net/http
- WebSocket support

**Frontend**
- React
- WebSocket client

**Development**
- GitHub Codespaces

---

## Running the Project

### Backend
go run cmd/server/main.go


### Server runs on:
http://localhost:8080


### Health check:
/health


---

## Future Improvements

Possible extensions include:

- Admin reassignment
- Reconnect handling
- Persistent game storage
- Spectator mode
- Enhanced UI styling
- Configurable penalty types
- Event history persistence
- Card art

---

## Closing Notes

Mao is inherently social and unpredictable. This application does not attempt to codify its rules. Instead, it provides structure while preserving ambiguity, allowing any rule set to emerge through player interaction.
