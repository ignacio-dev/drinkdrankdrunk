// 3RD PARTY MODULES
const express = require('express');
const socketio = require('socket.io');

// NATIVE MODULES
const http = require('http');
const path = require('path');

// CUSTOM MODULES
const Player = require('./lib/Player');
const { ROOMS, Room } = require('./lib/Room');
const Deck = require('./lib/Deck');

// APP & SERVER
const APP = express();
const SERVER = http.createServer(APP);
const PORT = process.env.PORT || 3000;
const IO = socketio(SERVER, {
	pingInterval: 10000
});

// STATIC FOLDER
APP.use(express.static(path.join(__dirname, 'public'), {
	maxAge: 86400000
}));


// SOCKETS
IO.on('connection', socket => {

	// CONNECT
	socket.on('playerJoinReq', ({ room, nickname, avatar, session }) => {
		let player = new Player(socket.id, room, nickname, avatar, session);
		if (session) player.recoverData(session);
		socket.join(player.room);
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));

		if (player.moderator) {
			if (!ROOMS[player.findRoomIndex()].running) {
				socket.emit('timerPermits');
			}	
		}
		if (player.firstMove) socket.emit('firstMove');
		if (player.turn) socket.emit('turn');
	});

	// IMG PRE CACHE
	socket.on('imgPreCacheReq', () => {
		let precacher = Deck.getPreCacheData();
		if (precacher) {
			socket.emit('imgCacheResp', precacher);
		}	
	});

	// SEND LOCAL ID
	socket.emit('localID', socket.id);

	// TIMER
	socket.on('timerStartReq', () => {
		let player = Player.findById(socket.id);
		let roomIndex = player.findRoomIndex();
		ROOMS[roomIndex].startTimer(time => {
			IO.to(player.room).emit('time', time);
		});
	});

	// I DRANK
	socket.on('IDrankReq', () => {
		let player = Player.findById(socket.id);
		player.drink();
		IO.to(player.room).emit('IDrankRes', player);
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
	});

	// NEXT PLAYER
	socket.on('nextPlayerReq', () => {
		let player = Player.findById(socket.id);
		player.passTurn();
		let nextPlayer = player.findNextPlayer();
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
		IO.to(nextPlayer.id).emit('turn');
	});

	// CARD REQUEST
	socket.on('cardReq', () => {
		let player = Player.findById(socket.id);
		let card = player.drawCard();
		socket.emit('cardRes', card);
	});

	// ACTION
	socket.on('actionReq', card => {
		let player = Player.findById(socket.id);
		player.discardAction(card);
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room), card);
	});

	// RULE
	socket.on('ruleReq', card => {
		let player = Player.findById(socket.id);
		let ruleDiscarded = player.discardRule(card);
		if (ruleDiscarded) {
			IO.to(player.room).emit('updateRoom', Room.findByCode(player.room), card);
		}
		else {
			socket.emit('mustReplaceRule', card);
		}
	});

	socket.on('ruleReplaceReq', ({num, cardName}) => {
		let player = Player.findById(socket.id);
		let card = player.replaceRule(num, cardName);
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room), card);
	});

	// STATE
	socket.on('stateReq', card => {
		let player = Player.findById(socket.id);
		player.appendCard(card);
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room), card);
		IO.to(player.room).emit('stateResp', {card, player})
	});

	// SPECIAL
	socket.on('targetsReq', cardName => {
		let player = Player.findById(socket.id);
		let card = Room.findCardByName(cardName);
		response = player.getTargets(card);
		socket.emit('targetsResp', response);
	});

	// ANARCHY
	socket.on('anarchyReq', specialCard => {
		let player = Player.findById(socket.id);
		player.anarchy(specialCard);
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
		IO.to(player.room).emit('specialCardUsed', {
			playerOrig: player,
			specialCard
		});

	});

	// ABRAKADABRA
	socket.on('abraKadabra', ({ targPlayerID, targCardName, origCardName, specialName }) => {
		let player = Player.findById(socket.id);
		let playerTarg = Player.findById(targPlayerID);
		let targCard = Room.findCardByName(targCardName);
		let specCard = Room.findCardByName(specialName);
		player.abraKadabra(playerTarg, targCard, specCard);
		IO.to(player.room).emit('specialCardUsed', {
			playerOrig: player,
			playerTarg,
			specialCard: specCard
		});
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
	});

	// SWAP
	socket.on('swap', ({ targPlayerID, targCardName, origCardName, specialName }) => {
		let player = Player.findById(socket.id);
		let playerTarg = Player.findById(targPlayerID);
		let specialCard = Room.findCardByName(specialName);
		
		if (playerTarg) {
			player.swapCard(playerTarg, targCardName, origCardName, specialName);
			IO.to(player.room).emit('specialCardUsed', {
				playerOrig: player,
				playerTarg,
				specialCard

			});
		}	
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
		
	});

	// REMOVE
	socket.on('remove', ({ targPlayerID, targCardName, origCardName, specialName }) => {
		let player = Player.findById(socket.id);
		let playerTarg = Player.findById(targPlayerID);
		let targCard = Room.findCardByName(targCardName);
		let specCard = Room.findCardByName(specialName);
		player.removeCard(playerTarg, targCard, specCard);
		IO.to(player.room).emit('specialCardUsed', {
			playerOrig: player,
			playerTarg,
			specialCard: specCard
		});
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
	});

	// STEAL
	socket.on('steal', ({ targPlayerID, targCardName, origCardName, specialName }) => {
		let player = Player.findById(socket.id);
		let playerTarg = Player.findById(targPlayerID);
		let targCard = Room.findCardByName(targCardName);
		let specCard = Room.findCardByName(specialName);
		player.stealCard(playerTarg, targCard, specCard);
		IO.to(player.room).emit('specialCardUsed', {
			playerOrig: player,
			playerTarg,
			specialCard: specCard
		});
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
	});

	// SHOW
	socket.on('showReq', specialCard => {
		let player = Player.findById(socket.id);
		player.removeSpecialCard(specialCard.name);
		IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
		IO.to(player.room).emit('specialCardUsed', {
			playerOrig: player,
			specialCard
		});
	});

	// END GAME
	socket.on('endGameReq', () => {
		let roomCode = Player.findById(socket.id).room;
		let loser = Room.findLoser(roomCode);
		IO.to(roomCode).emit('endGameResp', loser);
	});

	// SHOW FORFEIT
	socket.on('forfeitReq', num => {
		let player = Player.findById(socket.id);
		let roomIndex = player.findRoomIndex();
		ROOMS[roomIndex].running = false;

		let forfeit = Room.pickRandomForfeit();
		IO.to(player.room).emit('forfeitResp', {
			forfeit,
			num
		});
		ROOMS[roomIndex].gameOver();

	});

	// DISCONNECT
	socket.on('disconnect', () => {
		let player = Player.findById(socket.id);
		if (player) {
			let nextPlayer = player.findNextPlayer();
			if (player.turn) {			
				if (nextPlayer.id !== player.id) {
					player.passTurn();
					IO.to(nextPlayer.id).emit('turn');
				}
			}
			if (player.moderator) {
				if (nextPlayer.id !== player.id) {
					nextPlayer.makeModerator();
					if (!ROOMS[player.findRoomIndex()].running) {
						IO.to(nextPlayer.id).emit('timerPermits');
					}
				}
			}
			player.disconnect();
			IO.to(player.room).emit('updateRoom', Room.findByCode(player.room));
		}
	});
});

// SERVER LISTEN
SERVER.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});