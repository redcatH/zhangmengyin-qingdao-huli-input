/**
 * 数据管理类
 * 负责Excel文件读取和JSON文件的读写操作
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import xlsx from 'xlsx';

export class DataManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * 读取Excel文件并转换为用户列表
     * @returns {Array} 用户列表
     */
    readExcelData() {
        const excelPath = this.config.getFilePath('excelFile');
        
        if (!excelPath || !existsSync(excelPath)) {
            this.logger.error(`Excel文件不存在: ${excelPath}`);
            return [];
        }

        try {
            this.logger.info(`开始读取Excel文件: ${excelPath}`);
            
            const workbook = xlsx.readFile(excelPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            
            // 跳过表头，从第二行开始处理
            const rowData = data.slice(1);
            const users = [];

            for (const row of rowData) {
                // 跳过空行或姓名为空的行
                if (!row[1] || row[1].toString().trim() === '') {
                    continue;
                }

                const name = row[1].toString().trim();
                const careType = row[2] ? row[2].toString().trim() : '';
                const tracheotomy = row[3] ? row[3].toString().trim() : '否';

                // 解析护理类型
                let ckf181 = '';
                if (careType === '家护（失能）') {
                    ckf181 = '05';
                } else if (careType === '家护（门诊慢特病）') {
                    ckf181 = '06';
                } else {
                    this.logger.error(`未知护理类型: ${name} - ${careType}`);
                    continue;
                }

                // 解析切开气管
                const ckh281 = tracheotomy === '是' ? '1' : '0';

                users.push({
                    name,
                    ckf181,
                    ckh281,
                    careType,
                    tracheotomy
                });
            }

            this.logger.info(`成功读取 ${users.length} 个用户数据`);
            return users;

        } catch (error) {
            this.logger.error(`读取Excel文件失败: ${error.message}`);
            return [];
        }
    }

    /**
     * 读取JSON文件
     * @param {string} fileKey - 文件配置键名
     * @returns {Array|Object} 文件内容
     */
    readJsonFile(fileKey) {
        const filePath = this.config.getFilePath(fileKey);
        
        if (!filePath || !existsSync(filePath)) {
            return fileKey.includes('File') ? [] : {};
        }

        try {
            const data = readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`读取JSON文件失败 ${filePath}: ${error.message}`);
            return fileKey.includes('File') ? [] : {};
        }
    }

    /**
     * 写入JSON文件
     * @param {string} fileKey - 文件配置键名
     * @param {Array|Object} data - 要写入的数据
     */
    writeJsonFile(fileKey, data) {
        const filePath = this.config.getFilePath(fileKey);
        
        if (!filePath) {
            this.logger.error(`无法获取文件路径: ${fileKey}`);
            return false;
        }

        try {
            const jsonData = JSON.stringify(data, null, 2);
            writeFileSync(filePath, jsonData, 'utf-8');
            return true;
        } catch (error) {
            this.logger.error(`写入JSON文件失败 ${filePath}: ${error.message}`);
            return false;
        }
    }

    /**
     * 检查用户是否已成功处理
     * @param {string} username - 用户名
     * @returns {boolean} 是否已处理
     */
    isUserProcessed(username) {
        const successfulUsers = this.readJsonFile('successFile');
        return Array.isArray(successfulUsers) && successfulUsers.includes(username);
    }

    /**
     * 添加成功处理的用户
     * @param {string} username - 用户名
     */
    addSuccessfulUser(username) {
        const successfulUsers = this.readJsonFile('successFile');
        
        if (!successfulUsers.includes(username)) {
            successfulUsers.push(username);
            this.writeJsonFile('successFile', successfulUsers);
            this.logger.info(`用户 ${username} 已添加到成功列表`);
        }
    }

    /**
     * 获取成功处理的用户列表
     * @returns {Array} 成功用户列表
     */
    getSuccessfulUsers() {
        return this.readJsonFile('successFile');
    }

    /**
     * 批量写入文件（用于备份）
     * @param {Object} files - 文件数据映射 {fileKey: data}
     */
    batchWriteFiles(files) {
        const results = {};
        
        for (const [fileKey, data] of Object.entries(files)) {
            results[fileKey] = this.writeJsonFile(fileKey, data);
        }
        
        return results;
    }

    /**
     * 导出处理结果到文件
     * @param {Object} stats - 统计信息
     * @param {Array} failedUsers - 失败用户列表
     */
    exportResults(stats, failedUsers = []) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const report = {
            timestamp: new Date().toISOString(),
            statistics: stats,
            failedUsers: failedUsers,
            configSnapshot: {
                excelFile: this.config.get('files.excelFile'),
                personnelLimits: this.config.get('personnel'),
                nursingItemIndices: this.config.get('nursingItemIndices')
            }
        };

        try {
            const reportPath = this.config.getFilePath('errorLog').replace('.log', `_report_${timestamp}.json`);
            writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
            this.logger.info(`处理报告已导出到: ${reportPath}`);
        } catch (error) {
            this.logger.error(`导出处理报告失败: ${error.message}`);
        }
    }
}
