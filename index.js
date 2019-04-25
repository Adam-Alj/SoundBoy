"use strict";

const Discord = require('discord.js')
const ytdl = require('ytdl-core');
const client = new Discord.Client()
var connection;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  var mysql = require('mysql');
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'SERVER USERNAME',
    password: 'SERVER PASSWORD',
    database: 'soundboy'
  });
  connection.connect((err) => {
    if (err) {
      return;
    }
  });
});


client.on('message', msg => {
  if (msg.content.charAt(0) === ';' && msg.content.length > 1) {
    const channel = client.channels.get(msg.member.voiceChannelID);
    const args = msg.content.substring(1).split(' ').filter((a) => a != '');
    switch (args.length) {
      case 5:
        if (timeToSeconds(args[3]) > 20) {
          displayError(msg, "Too long,  clips should be less than 20 seconds");
        } else {
          connection.query('SELECT * FROM sounds WHERE server_name = ? AND name = ?',
            [msg.member.guild.id, args[4]],
            (e, res, f) => {
              if (res.length < 1) {
                var exec = require('child_process').exec;
                exec("ffmpeg -ss " + toTimeString(args[2]) + " -i $(youtube-dl -f 140 -g '" + args[1] + "') -t " + toTimeString(args[3]) + " -strict -2 ./soundbank/" + args[4] + msg.member.guild.id + ".mp4", (e, out, stErr) => {
                  console.log(e);
                  console.log(out);
                  console.log(stErr);
                });

                connection.query('INSERT INTO sounds(server_name, youtube_link, start_time, duration, name) VALUES(?, ?, ?, ?, ?)', [msg.member.guild.id, args[1], args[2], args[3], args[4]]);
                sendMessage(msg, "We made it");
              } else {
                displayError(msg, "That's already a sound, pick a different name or delete the old one.");
              }
            }
          );
        }
        break;
      case 1:
        if (args[0] == "sounds") {
          displaySoundBoard(msg);
        } else if (args[0] == "help") {
          displayHelp(msg);
        } else {
          if (!channel) {
            msg.reply("You aren't in a voice channel...");
          } else {
            connection.query('SELECT * FROM sounds WHERE server_name = ? AND name = ?',
              [msg.member.guild.id, args[0]],
              (e, res, f) => {
                if (res.length < 1) {
                  displayError(msg, "That sound doesn't exist...");
                } else {
                  channel.join().then(connection => {
                    const output = connection.playFile('./soundbank/' + args[0] + msg.member.guild.id + '.mp4');
                    output.on('end', () => {
                      channel.leave();
                    });
                  });
                }
              });
          }
        }
        break;
      case 2:
        if (args[0] == "delete") {
          connection.query('DELETE FROM sounds WHERE server_name = ? AND name = ?',
            [msg.member.guild.id, args[1]], (e, res) => {
              if (res.affectedRows > 0) {
                var exec = require('child_process').exec;
                exec('rm ./soundbank/' + args[1] + msg.member.guild.id + '.mp4');
                sendMessage(msg, "Got him");
              }
            });
        } else {
          displayError(msg, "What's that? You need some ';help'?");
        }
        break;
      default:
        displayError(msg, "What's that? You need some ';help'?");
    }
  }
}
);

client.login('YOUR DISCORD BOT KEY');

function timeToSeconds(str) {
  let arr = str.split(':'), retVal;
  switch (arr.length) {
    case 1:
      retVal = Number(arr[0]);
      break;
    case 2:
      retVal = Number(arr[0] * 60) + Number(arr[1]);
      break;
    case 3:
      retVal = Number(arr[0] * 60 * 60) + Number(arr[1] * 60) + Number(arr[2]);
      break;
  }

  return retVal;

}

function toTimeString(str) {

  let arr = str.split(':'), retVal;
  switch (arr.length) {
    case 1:
      retVal = Number(arr[0]);
      break;
    case 2:
      retVal = Number(arr[0] * 60) + Number(arr[1]);
      break;
    case 3:
      retVal = Number(arr[0] * 60 * 60) + Number(arr[1] * 60) + Number(arr[2]);
      break;
  }

  let seconds = retVal % 60;
  let minutes = Math.floor(retVal / 60);
  let hours = Math.floor(minutes / 60);
  minutes = minutes % 60;

  retVal = String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
  return retVal;

}

function displaySoundBoard(msg) {
  let channel = client.channels.get(msg.member.lastMessage.channel.id);
  connection.query('SELECT * FROM sounds WHERE server_name = ?',
    [msg.member.guild.id], (e, res, f) => {
      let str = "";
      res.forEach(i => {
        str += i.name + " -- ";
      });
      str = str.substring(0, str.length - 4);
      channel.send(str);
    });
}

function displayHelp(msg) {
  let channel = client.channels.get(msg.member.lastMessage.channel.id);
  channel.send("Tfw not general intelligence. Here are the only things I understand...\n\n" +
    "1.   To add a new sound:\n" +
    ";create <youtube link> <start time> <duration> <name to save as>\n\n" +
    "2.   To play a sound:\n" +
    ";<name>\n\n" +
    "3.   To show the saved sounds:\n" +
    ";sounds\n\n" +
    "4.   To delete a sound:\n" +
    ";delete <name>\n\n" +
    "The command sequence below creates a new sound, plays it, then deletes it:\n" +
    ";create  youtubelink  1:32  10  someKindaSound\n;someKindaSound\n;delete  someKindaSound"
  );
}

function displayError(msg, str) {
  msg.reply(str);
}

function sendMessage(msg, str) {
  let channel = client.channels.get(msg.member.lastMessage.channel.id);
  channel.send(str);
}
