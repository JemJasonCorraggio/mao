export type GameStatus = "WAITING" | "ACTIVE" | "ENDED";

export interface CardDTO {
	rank: string;
	suit: string;
}

export type ActionType = "PLAY_CARD" | "DRAW";

export type ActionResolution =
	| "ACCEPT"
	| "ACCEPT_WITH_PENALTY"
	| "REJECT";

export interface ActionDTO {
	id: string;
	playerId: string;
	type: ActionType;
	card?: CardDTO | null;
	challengedBy: string[];
	acceptedBy: string[];
}

export interface PlayerGameState {
	id: string;
	status: GameStatus;
	adminId: string;
	players: string[];
	hand: CardDTO[];
	playerId: string;
	currentAction?: ActionDTO | null;
	topCard?: CardDTO | null;
	lastAction?: ActionDTO | null;
	winnerId?: string | null;
}

export type OutgoingMessage =
	| { type: "CREATE_GAME"; name: string }
	| { type: "JOIN_GAME"; gameId: string; name: string }
	| { type: "START_GAME"; gameId: string }
	| { type: "PROPOSE_DRAW"; gameId: string }
	| { type: "PROPOSE_PLAY"; gameId: string; card: CardDTO }
	| { type: "ACCEPT_ACTION"; gameId: string }
	| { type: "CHALLENGE_ACTION"; gameId: string }
	| { type: "RESOLVE_ACTION"; gameId: string; resolution: ActionResolution; penaltyCount?: number }
	| { type: "ADMIN_PENALIZE"; gameId: string; targetPlayerId: string; penaltyCount?: number };

export type ServerMessage =
	| { type: "GAME_STATE"; payload: PlayerGameState }
	| { type: string; payload?: unknown };