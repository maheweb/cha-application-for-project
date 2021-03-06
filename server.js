var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');
users = {};

server.listen(process.env.PORT || 3000);

console.log('server running...');


mongoose.connect('mongodb://localhost/chat', function(err){
	if(err){	
		console.log(err);
	}else{
		console.log('Connected to mongodb!');
	}
});

var chatSchema = mongoose.Schema({
	msg: String,
	nick: String,
	created: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message', chatSchema);

app.use("/bower_components", express.static(__dirname + "/bower_components"));
app.use("/", express.static(__dirname + "/"));

app.get('/', function (req, res){
	res.sendFile(__dirname + '/index.html');

});

io.sockets.on('connection', function(socket){
	var query = Chat.find({});
		query.sort('-created').limit(8).exec(function(err, docs){
		if(err) throw err;
		socket.emit('load old msgs', docs);
	});
	socket.on('new user', function(data, callback){
		if(data in users){
			callback(false);
		}else{
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNickname();
		}
	});

	function updateNickname(){
		io.sockets.emit('username', {msg: Object.keys(users), nick: socket.nickname});
	}
	socket.on('send message', function(data, callback){
		var msg = data.trim();
		if(msg.substr(0, 3)==='/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					//console.log(Object.keys(users));
				}else{
					callback('Error! Enter a valid username.');
				}
			}else{
				callback('Error! Please Enter a message for your whisper.');
			}

			
		}else{
			var newMsg = new Chat({msg: msg, nick: socket.nickname});
			newMsg.save(function(err){
				if(err) throw err;
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
			});
			
			
		}
		
		
	});
	socket.on('disconnect', function(data){
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNickname();
	});
});