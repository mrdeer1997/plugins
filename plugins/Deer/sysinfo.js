/**
 * @author 啊屁
 * @team 啊屁
 * @name sysinfo
 * @version 1.0.4
 * @description 获取系统信息
 * @rule ^(sysinfo)$
 * @admin true
 * @public false
 * @priority 1
 * @disable false
 */

module.exports = async (bot, msg) => {
    try {
        const os = require('os');
        const si = require('systeminformation');

        const platform = os.platform();
        const arch = os.arch();
        const uptime = os.uptime();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const cpuInfo = os.cpus();
        const osType = os.type();
        const osRelease = os.release();
        const loadAvg = os.loadavg();

        // 获取GPU信息
        const gpuData = await si.graphics();
        const gpus = (gpuData.controllers && gpuData.controllers.length > 0)
            ? gpuData.controllers.map(gpu => `${gpu.vendor} ${gpu.model} (${gpu.vram || '未知'} MB VRAM)`).join(', ')
            : '无GPU信息';

        // 内存使用情况
        const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);
        const usedMemGB = (usedMem / 1024 / 1024 / 1024).toFixed(2);
        const freeMemGB = (freeMem / 1024 / 1024 / 1024).toFixed(2);

        // 运行时间
        const uptimeDays = Math.floor(uptime / 86400);
        const uptimeHours = Math.floor((uptime % 86400) / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const uptimeFormatted = `${uptimeDays}天 ${uptimeHours}小时 ${uptimeMinutes}分钟`;

        // 系统信息输出
        const output = `
**系统信息**
- 操作系统: ${osType} ${osRelease} (${platform}, 架构: ${arch})
- 运行时间: ${uptimeFormatted}
- 总内存: ${totalMemGB} GB
- 内存使用: 已使用 ${usedMemGB} GB / 未使用 ${freeMemGB} GB
- CPU型号: ${cpuInfo[0].model}（速度: ${cpuInfo[0].speed} MHz）（核心数: ${cpuInfo.length})
- 系统负载(1/5/15分钟): ${loadAvg.map(avg => avg.toFixed(2)).join('/')}
- GPU: ${gpus}
        `;

        // 通过 BNCR 3.0 发送消息
        await bot.reply(msg, output);
    } catch (error) {
        console.error(`获取系统信息时出错: ${error.message}`);
        await bot.reply(msg, `获取系统信息时出现错误: ${error.message}`);
    }
};
