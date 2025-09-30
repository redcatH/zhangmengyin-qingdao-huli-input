/**
 * 日志管理类
 * 负责统一的日志输出和错误记录
 */
import { writeFileSync, appendFileSync } from 'fs';

export class Logger {
    constructor(config) {
        this.config = config;
        this.level = config.get('logging.level', 'info');
        this.enableConsole = config.get('logging.enableConsole', true);
        this.enableFile = config.get('logging.enableFile', true);
        this.errorLogPath = config.getFilePath('errorLog');
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * 格式化时间戳
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * 格式化日志消息
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     */
    formatMessage(level, message) {
        return `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`;
    }

    /**
     * 判断是否应该输出该级别的日志
     * @param {string} level - 日志级别
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level];
    }

    /**
     * 输出日志
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     */
    log(level, message) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message);

        // 控制台输出
        if (this.enableConsole) {
            if (level === 'error') {
                console.error(formattedMessage);
            } else if (level === 'warn') {
                console.warn(formattedMessage);
            } else {
                console.log(formattedMessage);
            }
        }

        // 文件输出（只记录错误到文件）
        if (this.enableFile && level === 'error' && this.errorLogPath) {
            try {
                appendFileSync(this.errorLogPath, formattedMessage + '\n', 'utf-8');
            } catch (error) {
                console.error('写入日志文件失败:', error.message);
            }
        }
    }

    /**
     * 错误日志
     * @param {string} message - 错误消息
     */
    error(message) {
        this.log('error', message);
    }

    /**
     * 警告日志
     * @param {string} message - 警告消息
     */
    warn(message) {
        this.log('warn', message);
    }

    /**
     * 信息日志
     * @param {string} message - 信息消息
     */
    info(message) {
        this.log('info', message);
    }

    /**
     * 调试日志
     * @param {string} message - 调试消息
     */
    debug(message) {
        this.log('debug', message);
    }

    /**
     * 记录用户处理错误
     * @param {string} username - 用户名
     * @param {Error} error - 错误对象
     */
    logUserError(username, error) {
        let errorMessage = `用户处理失败: ${username} - ${error.message}`;
        
        if (error.responseBody) {
            errorMessage += `\n响应内容: ${error.responseBody}`;
        }
        
        if (error.stack) {
            errorMessage += `\n堆栈跟踪: ${error.stack}`;
        }

        this.error(errorMessage);
    }

    /**
     * 记录处理进度
     * @param {number} current - 当前处理数量
     * @param {number} total - 总数量
     * @param {number} success - 成功数量
     * @param {number} failed - 失败数量
     */
    logProgress(current, total, success, failed) {
        const percentage = ((current / total) * 100).toFixed(1);
        const message = `处理进度: ${current}/${total} (${percentage}%) | 成功: ${success} | 失败: ${failed}`;
        this.info(message);
    }

    /**
     * 记录最终统计
     * @param {Object} stats - 统计信息
     */
    logFinalStats(stats) {
        this.info('='.repeat(50));
        this.info('处理完成统计:');
        this.info(`总用户数: ${stats.total}`);
        this.info(`成功用户数: ${stats.success}`);
        this.info(`失败用户数: ${stats.failed}`);
        this.info(`跳过用户数: ${stats.skipped || 0}`);
        if (stats.total > 0) {
            this.info(`成功率: ${((stats.success / stats.total) * 100).toFixed(1)}%`);
        }
        this.info('='.repeat(50));
    }
}
