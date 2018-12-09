"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_api_1 = require("./discord_api");
const discord_bot_1 = require("./discord_bot");
const database_1 = require("./database");
const log_1 = require("./log");
exports.default = {
    async apply_request(req, res) {
        //console.log(req.body);
        var response = await discord_api_1.default.getDiscordUserData(req.body.token);
        if (response.code === 0) {
            return res.json({
                result: response.message
            });
        }
        var user_current_request = await database_1.default.getWhitelistRequest(response.id);
        if (user_current_request.length > 0)
            return res.json({ result: 'REQUEST_ALREADY_IN_DATABASE' });
        var insert_res = await database_1.default.addWhitelistRequest(req.body.answers, response.username, response.discriminator, response.id);
        //console.log(insert_res);
        if (insert_res.affectedRows > 0) {
            res.json({ result: 'SUCCESS' });
            let msg = `<@${response.id}> właśnie zlożył podanie o whiteliste.`;
            log_1.default(msg);
            try {
                discord_bot_1.default.sendChannelMessage('520748695059300383', msg).catch((e) => {
                    console.log('Cannot send message to channel 520748695059300383');
                    discord_bot_1.default.sendChannelMessage('516321132656197661', 'test');
                });
            }
            catch (e) {
                console.error('Sending channel message failed:', e);
            }
        }
        else
            res.json({ result: 'DATABASE_ERROR' });
    },
    async status_request(req, res) {
        var response = await discord_api_1.default.getDiscordUserData(req.body.token);
        if (response.code === 0) {
            return res.json({
                result: response.message
            });
        }
        var user_current_request = await database_1.default.getWhitelistRequest(response.id);
        if (user_current_request.length > 0)
            res.json({ result: 'SUCCESS', status: user_current_request[0]['status'] });
        else
            res.json({ result: 'SUCCESS', status: 'nothing' });
    },
    async applicants_request(req, res) {
        var response = await discord_api_1.default.getDiscordUserData(req.body.token);
        if (response.code === 0)
            return res.json({ result: response.message });
        if (discord_api_1.default.isAdmin(response.id) === false)
            return res.json({ result: 'INSUFICIENT_PERMISSIONS' });
        if (req.body.requested_status !== 'accepted' && req.body.requested_status !== 'rejected')
            req.body.requested_status = 'pending';
        var select_res = await database_1.default.getRequests(req.body.requested_status);
        var data = [];
        select_res.forEach((res) => {
            var wl_app_data = {
                id: res.id,
                timestamp: res.timestamp,
                nick: res.discord_nick,
                discriminator: res.discord_discriminator,
                data_ur: res.data_ur,
            };
            database_1.default.QUESTION_NAMES.map(qn => {
                wl_app_data[qn] = res[qn];
            });
            data.push(wl_app_data);
        });
        res.json({ result: 'SUCCESS', data: data });
    },
    async update_request(req, res) {
        var response = await discord_api_1.default.getDiscordUserData(req.body.token);
        if (response.code === 0)
            return res.json({ result: response.message });
        //console.log(response);
        if (discord_api_1.default.isAdmin(response.id) === false) {
            log_1.default('Someone without permissions trying to accept/reject whitelist request:', response.id, response.username);
            return res.json({ result: 'INSUFICIENT_PERMISSIONS' });
        }
        var update_res = await database_1.default.changeStatus(req.body.id, req.body.requested_status);
        // console.log(update_res);
        if (update_res.affectedRows < 1)
            return res.json({ result: 'DATABASE_ERROR' });
        res.json({ result: 'SUCCESS' });
        setTimeout(async () => {
            var new_status;
            if (req.body.requested_status === 'accepted')
                new_status = `zaakceptowane. Zapraszamy na rozmowę, w której sprawdzimy twoją znajomość regulaminu. <#516321132656197661>`;
            else if (req.body.requested_status === 'rejected')
                new_status = 'odrzucone.';
            else
                return;
            var target_user_discord_id = await database_1.default.getUserDiscordID(req.body.id);
            if (target_user_discord_id.length > 0) {
                try {
                    log_1.default('User', response.username, response.id, 'changed whitelist request status to', req.body.requested_status, 'for user', target_user_discord_id[0].discord_id);
                    discord_bot_1.default.sendPrivateMessage(target_user_discord_id[0].discord_id, `Witaj. Twoje podanie o whiteliste zostało właśnie ${new_status}`);
                }
                catch (e) {
                    console.log('Cannot send private message to', target_user_discord_id[0].discord_id);
                }
            }
        });
    }
};
