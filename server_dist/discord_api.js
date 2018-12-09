"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
// import btoa from 'btoa';
const btoa = require('btoa');
const log_1 = require("./log");
var CLIENT_ID = null;
var SECRET_KEY = null;
const admins = [
    '204639827193364492',
    '363604545261142017',
    '272366948371660801',
    '217963448682807297',
];
process.argv.forEach((val) => {
    if (val.startsWith('CLIENT_ID'))
        CLIENT_ID = val.replace('CLIENT_ID=', '');
    else if (val.startsWith('SECRET_KEY'))
        SECRET_KEY = val.replace('SECRET_KEY=', '');
});
if (!SECRET_KEY)
    throw new Error('You must specify bot SECRET_KEY as argument: SECRET_KEY=VALUE');
if (!CLIENT_ID)
    throw new Error('You must specify bot CLIENT_ID as argument: CLIENT_ID=VALUE');
var redirect;
var client_port;
var final_redirect;
if (process.env.NODE_ENV === 'dev') {
    redirect = encodeURIComponent(`http://localhost:${global.PORT}/discord_callback`);
    client_port = 3000;
    final_redirect = `http://localhost:${client_port}/login_result`;
}
else {
    redirect = encodeURIComponent(`http://54.37.128.46/discord_callback`);
    client_port = global.PORT;
    final_redirect = `http://54.37.128.46/login_result`;
}
function getDiscordUserData(token) {
    return node_fetch_1.default('http://discordapp.com/api/users/@me', {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    }).then((response) => response.json());
}
exports.default = {
    login_request: function (req, res) {
        res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`);
    },
    getDiscordUserData: getDiscordUserData,
    isAdmin: function (id) {
        return admins.indexOf(id) !== -1;
    },
    discord_callback: function (req, res) {
        if (!req.query.code) {
            console.error('NoCodeProvided');
            res.redirect(final_redirect + `?success=false`);
        }
        const code = req.query.code;
        const creds = btoa(`${CLIENT_ID}:${SECRET_KEY}`);
        node_fetch_1.default(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${creds}`,
            },
        }).then((res) => res.json()).then(async (json) => {
            try {
                var response = await getDiscordUserData(json.access_token);
                if (response.code === 0)
                    throw new Error('Cannot fetch DiscordUserData');
                console.log('User logged in:', response.username + '#' + response.discriminator, 'id:', response.id);
                let is_admin = admins.indexOf(response.id) !== -1;
                log_1.default('User logged in:', response.username + '#' + response.discriminator, 'id:', response.id, 'admin:', is_admin);
                res.redirect(final_redirect + `?success=true&token=${json.access_token}?user=${response.username}#${response.discriminator}?admin=${is_admin}`);
            }
            catch (e) {
                console.error(e);
                res.redirect(final_redirect + `?success=false`);
            }
            //res.redirect(final_redirect + `?success=true&token=${json.access_token}`);
        }).catch((e) => {
            console.error(e);
            // res.status(400);
            // res.send(e.message);
            res.redirect(final_redirect + `?success=false`);
        });
    },
    restore_session: async function (req, res) {
        try {
            var ip = req.connection.remoteAddress.replace(/::ffff:/, '');
            if (typeof req.body.token !== 'string') {
                res.status(400);
                log_1.default('guest session', ip);
                return res.json({ result: 'You must provide token in body request' });
            }
            var response = await getDiscordUserData(req.body.token);
            if (response.code === 0) {
                log_1.default('client session expired or discord denied access', ip);
                res.json({
                    result: response.message
                });
            }
            else {
                log_1.default('client session', response.username, response.id, ip);
                res.json({
                    result: 'SUCCESS',
                    nick: response.username,
                    discriminator: response.discriminator,
                    is_admin: admins.indexOf(response.id) !== -1
                });
            }
        }
        catch (e) {
            console.error('Cannot restore user\'s session');
            res.status(400);
            res.json({ result: e.message });
        }
    }
};
