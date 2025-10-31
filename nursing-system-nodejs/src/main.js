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

    /**
     * Web模式运行 - 为Web界面提供的方法
     * @returns {Promise<Object>} 处理结果
     */
    async runWeb() {
        try {
            const startTime = new Date().toISOString();
            
            this.logger.info('='.repeat(60));
            this.logger.info('护理入住登记自动化系统启动 (Web模式)');
            this.logger.info('='.repeat(60));

            // 1. 读取用户数据
            const users = this.dataManager.readExcelData();
            if (!users || users.length === 0) {
                throw new Error('无法读取用户数据或数据为空');
            }

            this.logger.info(`成功读取 ${users.length} 个用户数据`);

            // 触发进度回调
            if (this.onProgress) {
                this.onProgress({
                    progress: 10,
                    message: `读取到 ${users.length} 个用户数据`,
                    stage: 'reading'
                });
            }

            // 2. 系统预检查
            this.logger.info('开始系统预检查...');
            const preflightResult = await this.processor.preflightCheck();
            
            if (!preflightResult.ready) {
                throw new Error('系统预检查失败: ' + preflightResult.issues.join(', '));
            }

            this.logger.info('系统预检查通过');

            // 触发进度回调
            if (this.onProgress) {
                this.onProgress({
                    progress: 20,
                    message: '系统预检查通过',
                    stage: 'preflight'
                });
            }

            // 3. 开始处理用户
            this.logger.info('开始批量处理用户...');
            const processingStartTime = Date.now();

            const { stats, failedUsers } = await this.processor.batchProcessUsers(
                users,
                (current, currentStats,skipcount) => {
                    // Web模式的进度回调
                    const progress = 20 + Math.floor((current / users.length) * 70);
                    if (this.onProgress) {
                        this.onProgress({
                            progress,
                            message: `处理用户 ${current}/${users.length}: ${currentStats.lastProcessedUser || ''}`,
                            stage: 'processing',
                            currentUser: current,
                            totalUsers: users.length,
                            currentStats: currentStats
                        });
                    }
                }
            );

            const processingEndTime = Date.now();
            const duration = (processingEndTime - processingStartTime) / 1000;

            // 4. 完成处理
            if (this.onProgress) {
                this.onProgress({
                    progress: 95,
                    message: '处理完成，生成报告...',
                    stage: 'finalizing'
                });
            }

            // 导出详细报告
            const reportFilename = this.dataManager.exportResults(stats, failedUsers);

            // 5. 构建返回结果
            const result = {
                success: true,
                startTime,
                endTime: new Date().toISOString(),
                duration,
                statistics: {
                    total: stats.total,
                    success: stats.success,
                    failed: stats.failed,
                    skipped: stats.skipped,
                    successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0
                },
                failedUsers: failedUsers.map(user => ({
                    name: user.name,
                    error: user.error,
                    details: user.details || null
                })),
                personnelStats: this.personnelManager.getPersonnelStats(),
                processingSpeed: stats.total > 0 ? Math.round((stats.total / duration) * 100) / 100 : 0,
                reportFile: reportFilename
            };

            // 最终进度回调
            if (this.onProgress) {
                this.onProgress({
                    progress: 100,
                    message: `处理完成！成功 ${stats.success}/${stats.total} 个用户`,
                    stage: 'completed',
                    result
                });
            }

            this.logger.info('='.repeat(60));
            this.logger.info('护理入住登记系统运行完成 (Web模式)');
            this.logger.info('='.repeat(60));

            return result;

        } catch (error) {
            this.logger.error(`系统运行异常: ${error.message}`);
            
            const errorResult = {
                success: false,
                error: error.message,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
            };

            if (this.onProgress) {
                this.onProgress({
                    progress: 0,
                    message: `处理失败: ${error.message}`,
                    stage: 'error',
                    error: error.message
                });
            }

            throw errorResult;
        }
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
    // 如果没有提供配置文件路径，使用默认值
    const actualConfigPath = configPath || '../config.json';
    const system = new NursingRegistrationSystem(actualConfigPath);
    
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

// 只有在直接运行此文件时才执行主函数
// 检查是否是直接运行此文件，而不是被导入
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    main();
}

export { NursingRegistrationSystem };
