/**
 * 配置管理类
 * 负责加载和管理系统配置
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Config {
    constructor(configPath = '../config.json') {
        // 判断是否是绝对路径
        if (isAbsolute(configPath)) {
            // 绝对路径：临时配置文件
            this.configFile = configPath;
            this.basePath = dirname(configPath); // 使用配置文件所在目录作为基础路径
        } else {
            // 相对路径：正常配置文件
            this.basePath = join(__dirname, '..');
            const relativePath = configPath || '../config.json';
            this.configFile = join(this.basePath, relativePath.replace('../', ''));
        }
        this.config = this.loadConfig();
    }

    /**
     * 加载配置文件
     */
    loadConfig() {
        try {
            if (!existsSync(this.configFile)) {
                console.warn(`配置文件 ${this.configFile} 不存在，使用默认配置`);
                return this.getDefaultConfig();
            }

            const configData = readFileSync(this.configFile, 'utf-8');
            return JSON.parse(configData);
        } catch (error) {
            console.error(`加载配置文件失败: ${error.message}，使用默认配置`);
            return this.getDefaultConfig();
        }
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            api: {
                baseUrl: "http://test.vssh.top/api/rest",
                token: "SESSION=ZTVlOTgxYWUtMzQ3Mi00ZjA4LWJjMzgtZGYyZmZjMmUzYWJk",
                referer: "http://10.78.226.94:8080/",
                timeout: 30000
            },
            files: {
                excelFile: "入住表（刘毅用）9月.xls",
                nurseFile: "nurseObjs.json",
                doctorFile: "doctorObjs.json",
                caregiverFile: "caregiverObjs.json",
                successFile: "successfulUsers.json",
                errorLog: "error.log"
            },
            personnel: {
                nursesLimit: 50,
                doctorsLimit: 80,
                caregiversLimit: 30
            },
            specificCaregivers: [
                "张梅", "卢秀萍", "刘建贞", "刘同花", "刘同秀", "刘岩",
                "刘俊伟", "薛红", "薛光艳", "刘艳华", "薛玉英", "郎庆芳",
                "郭爱辉", "泮瑞英", "王甜甜", "于永香", "倪晓光", "营亮平",
                "王洁", "张本文", "刘香", "殷玉庆"
            ],
            nursingItemIndices: [0, 1, 9, 11, 13, 14, 15, 22, 27, 28, 29, 58],
            retry: {
                maxRetries: 3,
                delay: 1000
            },
            logging: {
                level: "info",
                enableConsole: true,
                enableFile: true
            }
        };
    }

    /**
     * 获取配置值，支持点分隔路径
     * @param {string} path - 配置路径，如 'api.baseUrl'
     * @param {*} defaultValue - 默认值
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * 获取文件完整路径
     * @param {string} fileKey - 文件配置键名
     */
    getFilePath(fileKey) {
        const filename = this.get(`files.${fileKey}`);
        if (!filename) return null;
        
        // 如果已经是绝对路径，直接返回
        if (isAbsolute(filename)) {
            return filename;
        }
        
        // 相对路径时，与basePath拼接
        return join(this.basePath, filename);
    }

    /**
     * 获取API请求头
     */
    getApiHeaders() {
        return {
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
            "content-type": "application/json;charset=UTF-8",
            "cookie": this.get('api.token'),
            "Referer": this.get('api.referer'),
            "Referrer-Policy": "no-referrer-when-downgrade"
        };
    }
}
