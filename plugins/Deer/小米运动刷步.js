/**
 * @author Dswang
 * @name 小米运动刷步
 * @team Dswang & SmartAI
 * @version 1.0.2
 * @description 适配 Bncr 3.0 的小米运动刷步插件
 * @rule ^刷新步数 (清空(账|帐)(号|户))?$
 * @rule ^刷新步数 ([1-9]\d*)?$
 * @priority 9999
 * @disable false
 */

const axios = require('axios');

module.exports = async (s) => {
  // 检查依赖
  await sysMethod.testModule(['axios'], { install: true });

  const userId = s.getUserId();
  const userDb = new BncrDB('Dswang_userSteps');

  // 检查是否为清空账号操作
  if (/^清空(账|帐)(号|户)$/.test(s.param(1))) {
    await userDb.del(userId);
    return s.reply('账户信息已清空');
  }

  let userData = await userDb.get(userId);

  // 第一次使用，输入账号和密码
  if (!userData) {
    const account = await promptInput(s, '请输入你的账号（邮箱或手机号）\n公开群请撤回手机号保护隐私\n输入q取消：', isValidAccount);
    if (!account) return;

    const password = await promptInput(s, '请输入你的密码(输入q取消)：');
    if (!password) return;

    const steps = await promptInput(s, '请输入要设置的步数（具体正整数或 "?" 随机生成）：', isValidSteps);
    if (!steps) return;

    // 保存用户信息
    const result = await sendStepsRequest(account, password, steps, s);
    if (result) {
      await userDb.set(userId, { account, password });
      await s.reply('用户信息已保存，若需删除请发送“刷新步数 清空账号”');
    }
  } else {
    // 已保存用户信息
    const { account, password } = userData;
    const steps = s.param(1) || '?';

    if (!isValidSteps(steps)) {
      return s.reply('步数参数错误，请输入具体正整数或 "?"');
    }

    await sendStepsRequest(account, password, steps, s);
  }
};

/**
 * 验证账号格式
 */
function isValidAccount(account) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\d{11}$/;
  return emailPattern.test(account) || phonePattern.test(account);
}

/**
 * 验证步数格式
 */
function isValidSteps(steps) {
  return steps === '?' || /^[1-9]\d*$/.test(steps);
}

/**
 * 发送步数请求
 */
async function sendStepsRequest(account, password, steps, s) {
  const params = { account, password, steps };

  try {
    const response = await axios.get('https://steps.api.030101.xyz/api', { params });
    const data = response.data;

    if (data.status === 'success') {
      await s.reply(`${data.message}，一天内不建议多次使用`);
      return true;
    } else if (data.message.includes('密码错误')) {
      await s.reply(`错误: ${data.message}，请修改密码后重试`);
      return false;
    } else {
      await s.reply(`错误: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.error('请求失败:', error);
    await s.reply('请求失败，请检查日志获取更多信息');
    return false;
  }
}

/**
 * 输入提示处理
 */
async function promptInput(s, promptMessage, validator) {
  await s.reply(promptMessage);
  const input = await s.waitInput(() => {}, 30, 'q');
  if (!input || input.getMsg().toLowerCase() === 'q') {
    await s.reply('操作已取消');
    return null;
  }

  const value = input.getMsg();
  if (validator && !validator(value)) {
    await s.reply('输入格式错误，请重新尝试');
    return null;
  }
  return value;
}
