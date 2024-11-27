/**
 * @author 小九九/Deer
 * @name 羊毛
 * @origin 小九九
 * @team 小九九/Deer
 * @version 1.0.2
 * @description 借助QLTools API 上传 CK
 * @rule ^(羊毛|refwool)$
 * @priority 1
 * @public true
 * @disable false
 * @admin false
 * @cron 0 0 7 */7 * *
 */

const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const marked = require('marked');

// 配置参数
const QLToolsURL = "http://"; // QLTools 前端地址
const appendGuidanceURL = true;
const guidanceURL = 'https://example.site/dir/page/#${wool.envRemark}';
const logLevel = "info"; // debug, info, warn
const simpleGuide = true;
const simpleGuideFilePath = 'https://example.site/dir/page'; // 教程地址
const articleFrame = 'body > article > div'; // 页面解析结构
const whereIsWoolName = 'h1';
const whereIsSimpleGuide = 'div > p';

const QLToolsDB = new BncrDB("qltools");
const cacheDB = new BncrDB('qltoolsTextCache');

// 主函数
module.exports = async (s) => {
    // 定时任务触发
    if (s.getFrom() === "cron") {
        await refreshCache();
        return s.reply('定时任务：羊毛缓存已刷新');
    }

    // 管理员手动刷新
    if (s.param(1) === 'refwool') {
        if (!(await s.isAdmin())) return s.reply('权限不足，仅管理员可执行此操作');
        await refreshCache();
        return s.reply('管理员手动刷新：羊毛缓存已刷新');
    }

    // 用户上传 CK
    await handleUserUpload(s);
};

// 处理用户上传 CK
async function handleUserUpload(s) {
    const woolKeys = await cacheDB.get('woolKeys');
    const woolListText = await cacheDB.get('woolListText');

    // 显示羊毛列表
    await s.reply(woolListText);
    const input = await s.waitInput((msg) => woolKeys.includes(msg.getMsg()), 60);

    if (!input) return s.reply('超时未输入，操作已取消');

    const woolIndex = input.getMsg();
    const wool = await QLToolsDB.get(woolIndex);
    if (!wool) return s.reply('选择无效，请重新输入');

    // 提示用户输入 CK 值
    const guidance = appendGuidanceURL ? `抓包教程：${eval('`' + guidanceURL + '`')}` : '';
    const simpleGuideText = simpleGuide ? `简要教程：${await makeSimpleGuide(wool.envRemark)}` : '';
    await s.reply(`请输入 "${wool.envRemark}" 的 CK 值\n${guidance}\n${simpleGuideText}`);

    const ckInput = await s.waitInput(null, 60);
    if (!ckInput) return s.reply('超时未输入，操作已取消');

    // 上传 CK
    const ck = ckInput.getMsg();
    await uploadCK(wool.serverId, wool.envName, ck, s);
}

// 缓存羊毛列表和教程
async function refreshCache() {
    await cacheDB.clear();
    await QLToolsDB.clear();

    // 缓存 Wool 列表
    const woolList = await fetchWoolList();
    for (let i = 0; i < woolList.length; i++) {
        await QLToolsDB.set(i + 1, woolList[i]);
    }
    await cacheDB.set('woolKeys', woolList.map((_, i) => `${i + 1}`));
    await cacheDB.set('woolListText', formatWoolList(woolList));

    // 缓存简化教程
    if (simpleGuide) {
        await cacheSimpleGuide();
    }
}

// 从 QLTools 获取羊毛列表
async function fetchWoolList() {
    try {
        const { data } = await axios.get(`${QLToolsURL}/v1/api/index/data`);
        if (data.code !== 2000) throw new Error(data.msg);

        return data.data.serverData.flatMap(server => server.envData.map(env => ({
            serverId: server.ID,
            envName: env.name,
            envRemark: env.nameRemarks,
        })));
    } catch (error) {
        throw new Error(`获取羊毛列表失败：${error.message}`);
    }
}

// 格式化羊毛列表为字符串
function formatWoolList(woolList) {
    return `羊毛列表：\n` + woolList.map((wool, i) => `${i + 1}. ${wool.envRemark}`).join('\n') + '\n请回复数字序号，退出回复 "q"';
}

// 上传 CK
async function uploadCK(serverId, ckName, ck, s) {
    try {
        const { data } = await axios.post(`${QLToolsURL}/v1/api/env/add`, {
            serverID: serverId,
            envName: ckName,
            envData: ck,
        });

        if (data.code === 2000) {
            s.reply('CK 提交成功');
        } else {
            s.reply(`CK 提交失败：${data.msg}`);
        }
    } catch (error) {
        s.reply(`请求失败，请稍后重试：${error.message}`);
    }
}

// 缓存简化教程
async function cacheSimpleGuide() {
    const response = await axios.get(simpleGuideFilePath);
    const $ = cheerio.load(response.data);

    $(articleFrame).each((_, element) => {
        const woolName = $(element).find(whereIsWoolName).text().trim();
        const guide = $(element).find(whereIsSimpleGuide).text().trim();
        cacheDB.set(woolName, guide);
    });
}

// 生成简化教程文本
async function makeSimpleGuide(woolName) {
    return await cacheDB.get(woolName) || '暂无简要教程';
}
