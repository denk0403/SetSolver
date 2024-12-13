enum Color {
	RED = 0,
	GREEN = 1,
	PURPLE = 2,
}

enum Shape {
	DIAMOND = 0,
	SQUIGGLE = 1,
	OVAL = 2,
}

enum Count {
	ONE = 0,
	TWO = 1,
	THREE = 2,
}

enum Shading {
	SOLID = 0,
	STRIPED = 1,
	OPEN = 2,
}

const SHAPE_STRINGS = ["◇", "ⸯ", "⬯"];

type CardId = string;

class Card {
	public static readonly PROPERTY_COUNT = 4;

	private static readonly CARD_CACHE: Map<CardId, Card> = new Map();

	static parse(id: String) {
		if (id.length === 4) {
			const values = id.split("").map(Number);
			if (values.every((value) => value === 0 || value === 1 || value === 2)) {
				return new Card(values[0], values[1], values[2], values[3]);
			}
		}
		throw new Error("Invalid Card ID");
	}

	readonly color: Color;
	readonly shape: Shape;
	readonly shading: Shading;
	readonly count: Count;
	readonly id: CardId;

	constructor(color: Color, shape: Shape, shading: Shading, count: Count) {
		const id = `${color}${shape}${shading}${count}`;

		this.color = color;
		this.shape = shape;
		this.shading = shading;
		this.count = count;
		this.id = id;

		let result = Card.CARD_CACHE.get(id);
		if (!result) {
			Card.CARD_CACHE.set(id, this);
			result = this;
		}
		return result;
	}
}

class Player {
	id: String;
	name: String;
	score: number;

	constructor(id: String, name: String) {
		this.id = id;
		this.name = name;
		this.score = 0;
	}

	incrementScore() {
		this.score = this.score + 1;
	}
}

class SetGame {
	static readonly SET_SIZE = 3;

	static readonly FULL_DECK = Object.freeze(
		(() => {
			const result: Card[] = [];
			for (let color = 0; color < SetGame.SET_SIZE; color++) {
				for (let shape = 0; shape < SetGame.SET_SIZE; shape++) {
					for (let shading = 0; shading < SetGame.SET_SIZE; shading++) {
						for (let count = 0; count < SetGame.SET_SIZE; count++) {
							result.push(new Card(color, shape, shading, count));
						}
					}
				}
			}
			return result;
		})()
	);

	public board: SetGrid | undefined;
	public deck: Card[] | undefined;
	public players: Player[];

	static createNewGame(players: Player[] = []): SetGame {
		return new SetGame(players);
	}

	constructor(players?: Player[], startingBoard?: SetGrid) {
		this.players = players ?? [];

		if (startingBoard) {
			this.board = startingBoard;
			this.deck = [...SetGame.FULL_DECK].filter((card) => {
				return !startingBoard.getAllCards().includes(card);
			});
		}

		return this;
	}

	startNewGame(): void {
		this.deck = [...SetGame.FULL_DECK];
		this.board = SetGrid.createRandomGrid(3, this.deck);
	}

	addPlayer(player: Player): SetGame {
		this.players.push(player);
		return this;
	}

	removePlayer(removedPlayer: Player): boolean {
		const index = this.players.findIndex((player) => player.id === removedPlayer.id);
		if (index !== -1) {
			this.players.splice(index, 1);
			return true;
		} else {
			return false;
		}
	}
}

type CardSet = [Card, Card, Card];

class SetGrid {
	private cards: Set<Card> = new Set();

	[Symbol.iterator] = this.cards.values;

	static createRandomGrid(rows: number = 3, deck: Card[] = [...SetGame.FULL_DECK]): SetGrid {
		if (rows > 27) {
			throw new Error("A SetGrid cannot have more than 27 rows.");
		}

		if (rows * SetGame.SET_SIZE > deck.length) {
			throw new Error("The given deck does not contain enough cards.");
		}

		const result: SetGrid = new SetGrid();
		for (let row = 0; row < rows; row++) {
			const rowArray: Card[] = [];
			for (let col = 0; col < SetGame.SET_SIZE; col++) {
				const randomIndex = Math.floor(Math.random() * deck.length);
				rowArray.push(deck.splice(randomIndex, 1)[0]);
			}
			result.addCards(rowArray[0], rowArray[1], rowArray[2]);
		}

		return result;
	}

	addCards(card1: Card, card2: Card, card3: Card): SetGrid {
		this.cards.add(card1).add(card2).add(card3);
		return this;
	}

	removeSet(card1: Card, card2: Card, card3: Card): boolean {
		return (
			SetSolver.isValidSet(card1, card2, card3) &&
			this.cards.has(card1) &&
			this.cards.has(card2) &&
			this.cards.has(card3) &&
			this.cards.delete(card1) &&
			this.cards.delete(card2) &&
			this.cards.delete(card3)
		);
	}

	getAllCards(): Card[] {
		return [...this.cards];
	}
}

class SetSolver {
	public static isValidSet(card1: Card, card2: Card, card3: Card): boolean {
		return (
			card1 != card2 &&
			(card1.color + card2.color + card3.color) % 3 === 0 &&
			(card1.shape + card2.shape + card3.shape) % 3 === 0 &&
			(card1.shading + card2.shading + card3.shading) % 3 === 0 &&
			(card1.count + card2.count + card3.count) % 3 === 0
		);
	}

	public static getAllTriads(cards: Card[]): CardSet[] {
		const result: CardSet[] = [];
		for (let i = 0; i < cards.length - 2; i++) {
			for (let j = i + 1; j < cards.length - 1; j++) {
				for (let k = j + 1; k < cards.length; k++) {
					result.push([cards[i], cards[j], cards[k]]);
				}
			}
		}
		return result;
	}

	public static getAllSets(cards: Card[]): CardSet[] {
		return SetSolver.getAllTriads(cards).filter((triad) =>
			SetSolver.isValidSet(triad[0], triad[1], triad[2])
		);
	}

	public static isExclusiveSet(set1: CardSet, set2: CardSet): boolean {
		return !set1.some((card) => set2.includes(card));
	}

	public static areMutuallyExclusive(sets: CardSet[]): boolean {
		const dedupeSet = new Set<string>();
		for (const set of sets) {
			for (const card of set) {
				if (dedupeSet.has(card.id)) return false;
				dedupeSet.add(card.id);
			}
		}

		return true;
	}

	/** Backtracking algorithm */

	// Given that we want to find the largest set of sets that are all disjoint,
	// this problem is referred to as the maximum disjoint set problem.
	// https://en.wikipedia.org/wiki/Maximum_disjoint_set

	// It is a special case of the maximum independent set problem (a.k.a vertex packing).
	// If we think of the set of all sets as a graph, where each set is a node and
	// each edge is a pair of sets that share a card, then we are trying to find the
	// largest set of nodes that are all disconnected from each other.
	// https://en.wikipedia.org/wiki/Maximal_independent_set

	// It can also be thought of as finding the maximum matching (a.k.a. largest independent edge set)
	// of the hypergraph, where each set is a hyperedge and each card of the set is a vertex.
	// https://en.wikipedia.org/wiki/Hypergraph
	// https://en.wikipedia.org/wiki/Matching_(graph_theory)

	public static getMaxExclusiveSets(cards: Card[]): CardSet[] {
		const allSets = SetSolver.getAllSets(cards);

		function maxExclusiveSetsHelper(sofar: Set<Card>, index: number): Set<Card> {
			// base case: we've reached the end of the list of sets
			if (index >= allSets.length) return sofar;

			const withoutCurrentSetResult = maxExclusiveSetsHelper(sofar, index + 1);

			const currentSet = allSets[index];
			if (currentSet.some((newCard) => sofar.has(newCard))) {
				return withoutCurrentSetResult; // the current set isn't disjoint
			}

			const withCurrentSetResult = maxExclusiveSetsHelper(
				new Set(sofar).add(currentSet[0]).add(currentSet[1]).add(currentSet[2]),
				index + 1
			);

			return withCurrentSetResult.size > withoutCurrentSetResult.size
				? withCurrentSetResult
				: withoutCurrentSetResult;
		}

		const result = maxExclusiveSetsHelper(new Set<Card>(), 0);
		const bestSetsFlat = [...result];

		const output: CardSet[] = [];
		for (let index = 0; index < bestSetsFlat.length; index += SetGame.SET_SIZE) {
			output.push(bestSetsFlat.slice(index, index + SetGame.SET_SIZE) as CardSet);
		}

		return output;
	}
}

type CardSetCount = [CardSet, number];

function shuffle<T>(arr: T[]): Array<T> {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * i);
		const temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
	return arr;
}

function testExclusiveWithRows(rows: number, showSets?: boolean) {
	const sg = SetGrid.createRandomGrid(rows, [...SetGame.FULL_DECK]);
	const allCards = sg.getAllCards();
	const total = SetSolver.getAllSets(allCards);

	// console.log("starting test:", rows, "rows");
	const start = performance.now();
	const exclusive = SetSolver.getMaxExclusiveSets(allCards);
	let end = performance.now();
	// console.log(exclusive);
	console.log(SetSolver.areMutuallyExclusive(exclusive));

	console.log(
		`${rows} rows time:`,
		`${(end - start) / 1000}s`,
		"results:",
		showSets ? total : total.length,
		showSets ? exclusive : exclusive.length
	);
}

// testExclusiveWithRows(3);
// testExclusiveWithRows(5, true);
// testExclusiveWithRows(6);
// testExclusiveWithRows(10);
// testExclusiveWithRows(12);
// testExclusiveWithRows(1);
// testExclusiveWithRows(1);
// testExclusiveWithRows(1);
// testExclusiveWithRows(5);

// function test(rows: number) {
// 	const sg = SetGrid.createRandomGrid(rows);
// 	const allCards = sg.getAllCards();

// 	const exclusive = SetSolver.getMaxExclusiveSets(allCards);
// 	const exclusive2 = SetSolver.getMaxExclusiveSets2(allCards);

// 	console.log("1", exclusive);
// 	console.log();
// 	console.log("2", exclusive2);
// }

// test(5);
