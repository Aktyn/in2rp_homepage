"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const Discord = require("discord.js");
const Discord = require("discord.js");
const log_1 = require("./log");
const hangman_1 = require("./hangman");
var TOKEN = undefined;
var started = false;
process.argv.forEach((val) => {
    //@ts-ignore
    if (val.startsWith('TOKEN='))
        TOKEN = val.replace('TOKEN=', '');
});
if (!TOKEN)
    throw new Error('You must specify bot TOKEN as argument: TOKEN=SECRET_TOKEN');
var bot = new Discord.Client();
var games = [];
function removeGame(user_id) {
    let current_game = games.find(g => g.id === user_id);
    if (current_game)
        games.splice(games.indexOf(current_game), 1);
}
function answerToMsg(author, message) {
    author.send(message).catch(e => console.log('Cannot answer to user:', author.username));
}
function onLogin() {
    console.log('Bot is running');
    // bot.user.setActivity("Pracownia Aktyna");
    /*bot.on('presenceUpdate', member => {
        console.log(member.user);
    });*/
    //204639827193364492
    // console.log( bot.channels.get('516321132656197661') );
    bot.on('message', message => {
        if (!message.author || message.author.bot)
            return;
        if (message.content.startsWith('!')) { //command
            log_1.default(message.author.username, 'used discordbot command:', message.content);
            let args = message.content.substring(1).split(' ');
            let cmd = args.shift();
            switch (cmd) {
                case 'wisielec':
                    if (games.find(g => g.id === message.author.id)) {
                        answerToMsg(message.author, "Już gramy w wisielca. Aby przerwać napisz: `!koniec`");
                        break;
                    }
                    answerToMsg(message.author, "No to gramy. Jeśli chcesz przerwać - napisz `!koniec`");
                    var game = new hangman_1.default();
                    games.push({
                        id: message.author.id,
                        game: game
                    });
                    answerToMsg(message.author, `Zgaduj litery pisząc je do mnie (pojedyńczo), lub spróbuj zgadnąć hasło wpisując je w całości.\nPozostało szans: ${game.getRemainingTries()}\n\`${game.getUserGuess()}\``);
                    break;
                case 'koniec':
                    removeGame(message.author.id);
                    answerToMsg(message.author, 'Fajnie się grało. Może jeszcze będzie okazja.');
                    break;
            }
        }
        else { //regular message
            var user_game = games.find(g => g.id === message.author.id);
            if (user_game !== undefined) {
                //console.log('xx');
                var guess_res = user_game.game.tryAnswerOrLetter(message.content);
                //console.log(guess_res);
                switch (guess_res) {
                    case hangman_1.default.RESULT.letter_guessed:
                        answerToMsg(message.author, `Zgadłeś\n\`${user_game.game.getUserGuess()}\``);
                        break;
                    case hangman_1.default.RESULT.wrong_guess:
                        if (user_game.game.getRemainingTries() === 0) {
                            answerToMsg(message.author, `Zostałeś powieszony :dizzy_face:\nHasło to: \`${user_game.game.getAnswer()}\`\nMoże następnym razem się uda.`);
                            removeGame(message.author.id);
                        }
                        else {
                            answerToMsg(message.author, `Źle\n\`${user_game.game.getUserGuess()}\`\nPozostało prób: ${user_game.game.getRemainingTries()}`);
                        }
                        break;
                    case hangman_1.default.RESULT.solved:
                        log_1.default('Someone won hangman game with discobot:', message.author.username, message.author.id);
                        answerToMsg(message.author, `Brawo! :clap:\nOdgadłeś hasło: \`${user_game.game.getUserGuess()}\``);
                        removeGame(message.author.id);
                        break;
                    case hangman_1.default.RESULT.repeated_guess:
                        answerToMsg(message.author, `Już tego próbowałeś. Nie powtarzaj odpowiedzi.\n\`${user_game.game.getUserGuess()}\``);
                        break;
                    case hangman_1.default.RESULT.wrong_input:
                        answerToMsg(message.author, `Możesz podawać tylko litery i spacje.\n\`${user_game.game.getUserGuess()}\``);
                        break;
                }
            }
            else {
                answerToMsg(message.author, "Cześć. Jestem tylko małomównym botem, chyba że chcesz zagrać w wisielca.\nNapisz do mnie `!wisielec` by zacząć. :wink:");
            }
        }
        /*let args = message.content.substring(1).split(' ');
        let cmd = args.shift();

        switch(cmd) {
            case 'say':
                if(message.author.id === '457479295078760448')
                    message.channel.send(args.join(' '))
                        .then(message.delete());
                break;
        }*/
    });
}
exports.default = {
    start: function () {
        if (started === true) {
            console.log('Bot already started');
            return;
        }
        started = true;
        bot.login(TOKEN).then(onLogin).catch(console.error);
    },
    sendPrivateMessage: function (user_id, message) {
        if (started) {
            var found_user = bot.users.get(user_id);
            if (found_user)
                return found_user.send(message);
            else
                return undefined;
        }
        return undefined;
    },
    //💬zarzad, id: 520748695059300383
    //whitelist, id: 516321132656197661
    sendChannelMessage: function (channel_id, message) {
        if (started) {
            var found_channel = bot.channels.get(channel_id);
            if (found_channel)
                //@ts-ignore
                return found_channel.send(message);
            else
                return undefined;
        }
        return undefined;
    }
};
