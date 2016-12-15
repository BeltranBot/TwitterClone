// app.js
'use strict'
var mysql = require('mysql');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var moment = require('moment');
var authUser = require('./middleware/auth-user');
var express = require('express');

var app = express();
var connection = mysql.createConnection({
	host: '127.0.0.1',
	user: 'twitter',
	password: 'cSBGF2b9FRTnpCCQ',
	database: 'twitter'
});

connection.connect(function(err){
	if (err) {
		console.log(err);
		return;
	}
	console.log('Connected to the database.');
	app.listen(8000, function() {
  	console.log('Web server listening on port 8000!');
	});
});

app.set('view engine','ejs');
app.set('views','./views');

// middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', function(req, res) {
	var query = 'select * from tweets order by created_at desc';
	var tweetCreated = req.cookies.tweets_created || [];

	connection.query(query, function(err, results) {
		if (err) {
			console.log(err);
		}
		for (var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.time_from_now = moment(tweet.created_at).fromNow();
			tweet.isEditable = tweetCreated.includes(tweet.id);
		}
		res.render('tweets', { tweets: results });	
	});
});

app.post('/tweets/create', function(req, res){
	// Code to create tweets goes here
	var query = 'insert into tweets (handle, body) values (?, ?)';
	var handle = req.body.handle;
	var body = req.body.body;
	var tweetsCreated = req.cookies.tweets_created || [];

	connection.query(query, [handle, body], function(err, results){
		if (err) {
			console.log(err);
		}
		tweetsCreated.push(results.insertId);
		res.cookie('tweets_created', tweetsCreated, { httpOnly: true });
		res.redirect('/');
	});
});

app.get('/tweets/:id([0-9]+)/edit', authUser, function(req, res) {
	var query = "select * from tweets where id = ?";
	var id = req.params.id;

	connection.query(query, [id], function(err, results) {
		if (err || results.length === 0) {

			console.log(err || 'No tweet found.');
			res.redirect('/');
			return;
		}

		var tweet = results[0];
		tweet.time_from_now = moment(tweet.created_at).fromNow();
		res.render('edit-tweet', { tweet: tweet });
	});
});

app.post('/tweets/:id([0-9]+)/update', authUser, function(req, res) {
	var updateQuery = "update tweets set body = ?, handle = ? where id = ?";
	var deleteQuery = "delete from tweets where id = ?";
	var id = req.params.id;
	var handle = req.body.handle;
	var body = req.body.body;
	var isDelete = req.body.delete_button !== undefined;

	var queryCallback = function(err) {
		if (err) {
			console.log(err);
		}
		res.redirect('/');
	};

	if (isDelete) {
		connection.query(deleteQuery, [id], queryCallback);
	} else {
		connection.query(updateQuery, [body, handle, id], queryCallback);	
	}
});