//var app = require('express')();
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const { randomInt } = require('crypto');
var express = require('express');
var app = express();
var mysql = require('mysql');
const { callbackify } = require('util');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
// var con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "tic"
// });
var con = mysql.createConnection({
  host: "freedb.tech",
  user: "freedbtech_bob",
  password: "Nopassword",
  database: "freedbtech_tic"
});
con.connect(function(err) {
  console.log("Connected To Database!");
  con.query("DELETE FROM users", function (err, result) {
    console.log("Flushed All Users"); // for safetry this must be done manual
  });
});

app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
   });
io.on('connection', (socket) => {console.log("user Connected: "+socket.id);
socket.on("GetPlayer1Socket",(data)=>{SetPlayer1Socket(data,socket);});
socket.on("PlayerMove",(data)=>{PlayerMove(data,socket);});
socket.on("GameOverToserver",(data)=>{GameOver(data);});
socket.on("OnMessage",(data)=>{OnMessage(data);});
socket.on("Ontyping",(data)=>{IsTyping(data);});
socket.on("RegisterNewUser",(data)=>{RegisterNewUser(data,socket);});
socket.on("ResetCurrentMatch",(data)=>{ResetCurrectMatch(data,socket);});
  socket.on('disconnect', () => {
    console.log('User disconnected With id='+socket.id);
    EndGameSession(socket);
   });

});


// server 
http.listen(4000, () => {
  console.log('listening on *:4000');
});


function RegisterNewUser(data,socket){
  con.query("SELECT * FROM users WHERE username = '"+data.username+"'", function (err, result) {
    if (typeof(result[0]) != "undefined"){
      if(result[0].SocketId !="0"){
io.to(socket.id).emit("ThrowError",{"errorcode":2,"message":"Sorry This Username Is Being Used By someone else and Two same Usernames would couse Instability On server even While Playing,Try Changing the username We will Look Forward to fix this Issue"});
      }
      else{
        var sql = "UPDATE users SET SocketId = '"+socket.id+"' WHERE username='"+data.username+"'"; 
        con.query(sql, function (err, result) {
        });
      }

    }
    else{
      var sql = "INSERT INTO users (username, SocketId) VALUES ('"+data.username+"', '"+socket.id+"')";
      con.query(sql, function (err, result) {
      });
    }
  });
  
}


function SetPlayer1Socket(data,socket){
  con.query("SELECT * FROM users WHERE username='"+data.username+"'", function (err, resultw, fields) {
    if(resultw.length>=1){
      //set match sesssion in database
      if(resultw[0].SocketId=="0"){
        io.to(socket.id).emit("OfflineUserRequested",null);
      }
      else{
        con.query("SELECT * FROM matchsessions WHERE player1='"+resultw[0].SocketId+"' OR player2='"+resultw[0].SocketId+"'", function (err, result, fields) {
          if(result.length>=1){
            io.to(socket.id).emit("ThrowError",{"errorcode":3,"message":"This User Is Already Playing With Someone And Threesome Match Is Not Allowed Yet"});
          }
          else{
            var sql = "INSERT INTO matchsessions (player1, player2) VALUES ('"+socket.id+"', '"+resultw[0].SocketId+"')";
            con.query(sql, function (err, result2) {
              io.to(socket.id).emit("SetPlayer1Socket",{"socketid":resultw[0].SocketId});
              io.to(resultw[0].SocketId).emit("PlayerRequestJoin",{"username":data.myname,"socketid":socket.id});
            });
          }
        });
      }

    }
    else{
      io.to(socket.id).emit("ThrowError",{"errorcode":1,"message":"Cant Find Any user With that username"});
    }
  });
}
function PlayerMove(data,socket){
  console.log(data);
  con.query("SELECT * FROM users WHERE socketid='"+data.Player1Socket+"'", function (err, result, fields) {
    if(result.length>=1){
  io.to(data.Player1Socket).emit("ServerMove",{"cell":data.cell})
    }else{
      io.to(socket.id).emit("Player1Disconnected",null);
    }
  });
}


function GameOver(data){
  io.to(data.socketid).emit("GameOver",1);
}

function EndGameSession(socket){ // have to correct this code
 // con.query("SELECT * FROM matchsessions WHERE player1='"+socket.id+"'", function (err, result, fields) {
 //   if (typeof(result[0]) != "undefined"){io.to(result[0].player2).emit("EndMatchSession",null);}
//  });
 // con.query("SELECT * FROM matchsessions WHERE player2='"+socket.id+"'", function (err, result, fields) {
 //   if (typeof(result[0]) != "undefined"){io.to(result[0].player1).emit("EndMatchSession",null);}
 // });
 ////////////////////////////////// DID MINIFICATION BUT NEEED TO BE CHECKED WELL
  con.query("SELECT * FROM matchsessions WHERE player1='"+socket.id+"' OR player2='"+socket.id+"'", function (err, result, fields) {
    if (typeof(result[0]) != "undefined"){
      io.to(result[0].player1).emit("EndMatchSession",null);
      io.to(result[0].player2).emit("EndMatchSession",null);
    }
    con.query("DELETE FROM matchsessions WHERE player1='"+socket.id+"' OR player2='"+socket.id+"'", function (err2, result2) {
    });
    var sql = "UPDATE users SET SocketId = '0' WHERE SocketId='"+socket.id+"'"; 
    con.query(sql, function (err, result) {
    });
  });


}
function ResetCurrectMatch(data,socket){
  io.to(data.player1).emit("ResetCurrectMatch",null);
}

function OnMessage(data){
  io.to(data.ToId).emit("OnMessage",{"msg":data.msg});
}
function IsTyping(data){
  io.to(data.ToId).emit("IsTyping",null);
}