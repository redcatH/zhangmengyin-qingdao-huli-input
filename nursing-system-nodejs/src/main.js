/**
 * 护理入住登记自动化系统 - 主程序
 * Node.js重构版本 - 提高可维护性和可读性
 * 
 * @author Assistant
 * @version 1.0.0
 * @date 2025-09-30
 */

import { Config } from './config.js';
import { Logger } from './logger.js';
import { DataManager } from './dataManager.js';
import { PersonnelManager } from './personnelManager.js';
import { ApiClient } from './apiClient.js';
import { NursingProcessor } from './nursingProcessor.js';

/**
 * 护理入住登记系统主类
 */
class NursingRegistrationSystem {
    constructor(configPath = '../config.json') {
        // 初始化配置
        this.config = new Config(configPath);
        
        // 初始化日志
        this.logger = new Logger(this.config);
        
        // 初始化各个管理器
        this.dataManager = new DataManager(this.config, this.logger);
        this.personnelManager = new PersonnelManager(this.config, this.dataManager, this.logger);
        this.apiClient = new ApiClient(this.config, this.logger);
        this.processor = new NursingProcessor(
            this.config, 
            this.dataManager, 
            this.personnelManager, 
            this.apiClient, 
            this.logger
        );

        this.logger.info('护理入住登记系统已初始化');
    }

    /**
     * 运行系统主流程
     */
    async run() {
        try {
            this.logger.info('='.repeat(60));
            this.logger.info('护理入住登记自动化系统启动');
            this.logger.info('='.repeat(60));

            // 1. 读取用户数据
            const users = this.dataManager.readExcelData();
            if (!users || users.length === 0) {
                this.logger.error('无法读取用户数据或数据为空，程序退出');
                return false;
            }

            this.logger.info(`成功读取 ${users.length} 个用户数据`);

            // 2. 系统预检查
            this.logger.info('开始系统预检查...');
            const preflightResult = await this.processor.preflightCheck();
            
            if (!preflightResult.ready) {
                this.logger.error('系统预检查失败:');
                preflightResult.issues.forEach(issue => {
                    this.logger.error(`  - ${issue}`);
                });
                return false;
            }

            this.logger.info('系统预检查通过');
            this.logPersonnelStatus(preflightResult.personnelStats);

            // 3. 开始处理用户
            this.logger.info('开始批量处理用户...');
            const startTime = Date.now();

            const { stats, failedUsers } = await this.processor.batchProcessUsers(
                users,
                (current, currentStats) => {
                    // 进度回调 - 可以在这里实现实时监控
                }
            );

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;

            // 4. 输出最终统计
            this.logger.logFinalStats(stats);
            this.logger.info(`总耗时: ${duration.toFixed(2)} 秒`);
            
            if (stats.total > 0) {
                this.logger.info(`平均处理速度: ${(stats.total / duration).toFixed(2)} 用户/秒`);
            }

            // 5. 导出结果报告
            if (failedUsers.length > 0) {
                this.logger.warn(`有 ${failedUsers.length} 个用户处理失败:`);
                failedUsers.forEach(user => {
                    this.logger.warn(`  - ${user.name}: ${user.error}`);
                });
            }

            // 导出详细报告
            this.dataManager.exportResults(stats, failedUsers);

            // 6. 最终人员状态
            const finalPersonnelStats = this.personnelManager.getPersonnelStats();
            this.logPersonnelStatus(finalPersonnelStats, '最终人员状态');

            this.logger.info('='.repeat(60));
            this.logger.info('护理入住登记系统运行完成');
            this.logger.info('='.repeat(60));

            return stats.success > 0;

        } catch (error) {
            this.logger.error(`系统运行异常: ${error.message}`);
            this.logger.error(`堆栈跟踪: ${error.stack}`);
            return false;
        }
    }

    /**
     * 记录人员状态
     * @param {Object} personnelStats - 人员统计
     * @param {string} title - 标题
     */
    logPersonnelStatus(personnelStats, title = '当前人员状态') {
        this.logger.info(`${title}:`);
        
        Object.entries(personnelStats).forEach(([role, stats]) => {
            const roleName = {
                nurses: '护士',
                doctors: '医生',
                caregivers: '护理员'
            }[role] || role;

            this.logger.info(`  ${roleName}: 总数${stats.total}, 可用${stats.available}, 已用容量${stats.usedCapacity}/${stats.totalCapacity}`);
            
            if (stats.ignored > 0) {
                this.logger.warn(`    已忽略${stats.ignored}人（达到上限）`);
            }
        });
    }

    /**
     * 获取系统状态
     * @returns {Object} 系统状态信息
     */
    getSystemStatus() {
        return {
            successfulUsers: this.dataManager.getSuccessfulUsers().length,
            personnelStats: this.personnelManager.getPersonnelStats(),
            configSnapshot: {
                excelFile: this.config.get('files.excelFile'),
                personnelLimits: this.config.get('personnel'),
                apiBaseUrl: this.config.get('api.baseUrl')
            }
        };
    }
}

/**
 * 主函数
 */
async function main() {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let configPath = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config' || args[i] === '-c') {
            configPath = args[i + 1];
            break;
        }
    }

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
护理入住登记自动化系统

使用方法:
  node src/main.js [选项]

选项:
  -c, --config <path>   指定配置文件路径 (默认: config.json)
  -h, --help           显示帮助信息

示例:
  node src/main.js
  node src/main.js --config custom-config.json
        `);
        process.exit(0);
    }

    // 创建并运行系统
    const system = new NursingRegistrationSystem(configPath);
    
    try {
        const success = await system.run();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('程序运行失败:', error.message);
        process.exit(1);
    }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

// 优雅退出处理
process.on('SIGINT', () => {
    console.log('\n收到退出信号，正在清理资源...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n收到终止信号，正在清理资源...');
    process.exit(0);
});

// 直接执行主函数
main();

export { NursingRegistrationSystem };
