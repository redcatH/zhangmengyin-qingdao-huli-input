/**
 * 护理入住登记系统 - Web服务器
 * 提供Web界面和API接口
 * 
 * @author Assistant
 * @version 1.0.0
 * @date 2025-09-30
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'fs';
import { NursingRegistrationSystem } from './main.js';
import { DataManager } from './dataManager.js';
import { Config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class NursingWebServer {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.port = 3000;
        this.uploadsDir = join(rootDir, 'uploads');
        this.historyDir = join(rootDir, 'history');
        this.reportsDir = join(rootDir, 'reports');
        
        this.initDirectories();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
        this.cleanupStaleProcesses();
    }

    /**
     * 初始化必要的目录
     */
    initDirectories() {
        [this.uploadsDir, this.historyDir, this.reportsDir].forEach(dir => {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * 设置中间件
     */
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(join(rootDir, 'public')));
        this.app.use('/uploads', express.static(this.uploadsDir));
        this.app.use('/reports', express.static(this.reportsDir));
    }

    /**
     * 设置文件上传
     */
    setupFileUpload() {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadsDir);
            },
            filename: (req, file, cb) => {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const ext = file.originalname.split('.').pop();
                cb(null, `${timestamp}.${ext}`);
            }
        });

        return multer({ 
            storage,
            fileFilter: (req, file, cb) => {
                const allowedTypes = ['.xls', '.xlsx'];
                const ext = file.originalname.toLowerCase().slice(-4);
                if (allowedTypes.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error('只支持Excel文件 (.xls, .xlsx)'));
                }
            },
            limits: {
                fileSize: 10 * 1024 * 1024 // 10MB
            }
        });
    }

    /**
     * 设置路由
     */
    setupRoutes() {
        const upload = this.setupFileUpload();

        // 主页
        this.app.get('/', (req, res) => {
            res.sendFile(join(rootDir, 'public', 'index.html'));
        });

        // 上传Excel文件
        this.app.post('/api/upload', upload.single('excelFile'), (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ success: false, message: '请选择Excel文件' });
                }

                // 仅上传文件，不自动执行任务
                res.json({
                    success: true,
                    message: '文件上传成功，请配置参数后点击开始处理',
                    file: {
                        filename: req.file.filename,
                        originalname: req.file.originalname,
                        size: req.file.size,
                        uploadTime: new Date().toISOString()
                    }
                });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 验证处理参数
        this.app.post('/api/validate', async (req, res) => {
            try {
                const { filename, specificCaregivers, config } = req.body;
                
                if (!filename) {
                    return res.status(400).json({ success: false, message: '请先上传Excel文件' });
                }

                const filePath = join(this.uploadsDir, filename);
                if (!existsSync(filePath)) {
                    return res.status(400).json({ success: false, message: '文件不存在或已被删除' });
                }

                if (!specificCaregivers || specificCaregivers.length === 0) {
                    return res.status(400).json({ success: false, message: '请至少配置一个护理员' });
                }

                // 进行基础验证，只读取Excel文件预览，不创建完整系统
                let tempConfigPath = null;
                try {
                    // 创建临时Config实例用于验证
                    const tempResult = this.createTempConfigFile(filePath, specificCaregivers, config);
                    tempConfigPath = tempResult.configPath;
                    const tempConfig = new Config(tempConfigPath);
                    
                    // 直接使用DataManager读取数据，而不创建完整系统
                    const tempDataManager = new DataManager(tempConfig, { info: () => {}, error: () => {} });
                    const users = tempDataManager.readExcelData();
                    
                    // 简单的人员统计
                    const personnelStats = {
                        doctors: config.doctorObjs || [],
                        caregivers: specificCaregivers,
                        nurses: config.nurseObjs || []
                    };
                    
                    res.json({
                        success: true,
                        message: '参数验证成功',
                        preview: {
                            totalUsers: users.length,
                            sampleUsers: users.slice(0, 5).map(u => u.姓名 || u.name || '未知'),
                            personnelStats,
                            caregiverCount: specificCaregivers.length,
                            estimatedTime: Math.ceil(users.length / 20) // 预估处理时间（秒）
                        }
                    });
                } catch (error) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `文件验证失败: ${error.message}` 
                    });
                } finally {
                    // 验证完成后不清理临时目录，保留所有文件以供后续任务重用
                    if (tempConfigPath) {
                        try {
                            const tempTaskDir = dirname(tempConfigPath);
                            if (existsSync(tempTaskDir)) {
                                console.log('📋 验证完成，保留临时目录文件以供任务使用');
                            }
                        } catch (error) {
                            console.warn(`验证后检查临时目录失败: ${error.message}`);
                        }
                    }
                }

            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 开始处理（需要用户明确确认）
        this.app.post('/api/process', async (req, res) => {
            try {
                const { filename, specificCaregivers, config, confirmed } = req.body;
                
                if (!confirmed) {
                    return res.status(400).json({ success: false, message: '请确认处理参数后再开始' });
                }
                
                if (!filename) {
                    return res.status(400).json({ success: false, message: '请先上传Excel文件' });
                }

                const filePath = join(this.uploadsDir, filename);
                if (!existsSync(filePath)) {
                    return res.status(400).json({ success: false, message: '文件不存在或已被删除' });
                }

                if (!specificCaregivers || specificCaregivers.length === 0) {
                    return res.status(400).json({ success: false, message: '请至少配置一个护理员' });
                }

                // 创建历史记录
                const historyId = this.createHistoryRecord({
                    filename,
                    originalFilename: req.body.originalFilename || filename,
                    specificCaregivers,
                    config,
                    startTime: new Date().toISOString(),
                    userConfirmed: true
                });

                // 异步处理，通过Socket.IO发送进度
                this.processNursingData(historyId, filePath, specificCaregivers, config)
                    .catch(error => console.error('处理异常:', error));

                res.json({
                    success: true,
                    message: '处理任务已启动，请查看实时进度',
                    historyId
                });

            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 获取历史记录
        this.app.get('/api/history', (req, res) => {
            try {
                const historyFiles = readdirSync(this.historyDir)
                    .filter(file => file.endsWith('.json'))
                    .sort((a, b) => b.localeCompare(a)); // 最新的在前

                const history = historyFiles.map(file => {
                    const filePath = join(this.historyDir, file);
                    const content = JSON.parse(readFileSync(filePath, 'utf8'));
                    return {
                        id: file.replace('.json', ''),
                        ...content
                    };
                });

                res.json({ success: true, data: history });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 获取历史记录详情
        this.app.get('/api/history/:id', (req, res) => {
            try {
                const { id } = req.params;
                const filePath = join(this.historyDir, `${id}.json`);
                
                if (!existsSync(filePath)) {
                    return res.status(404).json({ success: false, message: '记录不存在' });
                }

                const content = JSON.parse(readFileSync(filePath, 'utf8'));
                res.json({ success: true, data: content });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 重新执行任务
        this.app.post('/api/retry/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const historyFilePath = join(this.historyDir, `${id}.json`);
                
                if (!existsSync(historyFilePath)) {
                    return res.status(404).json({ success: false, message: '历史记录不存在' });
                }

                // 读取历史记录
                const historyRecord = JSON.parse(readFileSync(historyFilePath, 'utf8'));
                const { filename, specificCaregivers, config } = historyRecord;

                // 检查原始文件是否还存在
                const originalFilePath = join(this.uploadsDir, filename);
                if (!existsSync(originalFilePath)) {
                    return res.status(400).json({ success: false, message: '原始Excel文件不存在，无法重新执行' });
                }

                // 更新历史记录状态为重新处理中
                this.updateHistoryRecord(id, {
                    status: 'retrying',
                    retryTime: new Date().toISOString()
                });

                // 生成任务ID（基于历史记录ID或者原始参数）
                const taskIdForReuse = this.generateTaskId(filename, specificCaregivers);

                // 异步重新处理，使用相同的任务ID以重用临时目录
                this.processNursingData(id, originalFilePath, specificCaregivers, config, taskIdForReuse)
                    .catch(error => console.error('重新处理异常:', error));

                res.json({
                    success: true,
                    message: '重新执行任务已启动，将重用之前的任务环境',
                    historyId: id,
                    taskId: taskIdForReuse
                });

            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 下载报告
        this.app.get('/api/download/:filename', (req, res) => {
            try {
                const { filename } = req.params;
                const filePath = join(this.reportsDir, filename);
                
                if (!existsSync(filePath)) {
                    return res.status(404).json({ success: false, message: '文件不存在' });
                }

                res.download(filePath);
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 获取系统状态
        this.app.get('/api/status', (req, res) => {
            try {
                const stats = {
                    uploadedFiles: readdirSync(this.uploadsDir).length,
                    historyRecords: readdirSync(this.historyDir).filter(f => f.endsWith('.json')).length,
                    reports: readdirSync(this.reportsDir).length,
                    serverTime: new Date().toISOString()
                };
                
                res.json({ success: true, data: stats });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // 获取配置文件（用于加载默认护理员配置）
        this.app.get('/config.json', (req, res) => {
            try {
                const configPath = join(rootDir, 'config.json');
                if (!existsSync(configPath)) {
                    return res.status(404).json({ success: false, message: '配置文件不存在' });
                }

                const config = JSON.parse(readFileSync(configPath, 'utf8'));
                res.json(config);
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }

    /**
     * 设置Socket.IO
     */
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('客户端连接:', socket.id);
            
            socket.on('disconnect', () => {
                console.log('客户端断开:', socket.id);
            });
        });
    }

    /**
     * 创建历史记录
     */
    createHistoryRecord(data) {
        const id = new Date().toISOString().replace(/[:.]/g, '-');
        const record = {
            ...data,
            id,
            status: 'processing',
            createdAt: new Date().toISOString()
        };
        
        const filePath = join(this.historyDir, `${id}.json`);
        writeFileSync(filePath, JSON.stringify(record, null, 2));
        
        return id;
    }

    /**
     * 更新历史记录
     */
    updateHistoryRecord(id, updates) {
        const filePath = join(this.historyDir, `${id}.json`);
        if (existsSync(filePath)) {
            const record = JSON.parse(readFileSync(filePath, 'utf8'));
            Object.assign(record, updates);
            writeFileSync(filePath, JSON.stringify(record, null, 2));
        }
    }

    /**
     * 生成任务ID
     */
    generateTaskId(filename, specificCaregivers) {
        const excelFileName = filename.replace(/\.(xls|xlsx)$/i, '');
        const caregiversHash = specificCaregivers.sort().join('-').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        return `${excelFileName}_${caregiversHash}`;
    }

    /**
     * 处理护理数据
     */
    async processNursingData(historyId, excelPath, specificCaregivers, customConfig = {}, reuseTaskId = null) {
        let tempConfigPath = null;
        
        try {
            // 发送开始处理事件
            this.io.emit('process-start', { historyId });

            // 创建临时配置文件（如果提供了reuseTaskId则重用现有任务目录）
            const tempResult = this.createTempConfigFile(excelPath, specificCaregivers, customConfig, reuseTaskId);
            tempConfigPath = tempResult.configPath;
            
            // 创建护理系统实例
            const system = new NursingRegistrationSystem(tempConfigPath);
            
            // 设置进度回调
            system.onProgress = (progress) => {
                this.io.emit('process-progress', { historyId, ...progress });
            };

            // 执行处理
            const result = await system.runWeb();

            // 保存报告文件
            const reportFilename = `report_${historyId}.json`;
            const reportPath = join(this.reportsDir, reportFilename);
            writeFileSync(reportPath, JSON.stringify(result, null, 2));

            // 更新历史记录
            this.updateHistoryRecord(historyId, {
                status: 'completed',
                result,
                reportFile: reportFilename,
                endTime: new Date().toISOString(),
                duration: Date.now() - new Date(result.startTime).getTime()
            });

            // 发送完成事件
            this.io.emit('process-complete', { historyId, result });

        } catch (error) {
            console.error('处理失败:', error);

            // 更新历史记录
            this.updateHistoryRecord(historyId, {
                status: 'failed',
                error: error.message,
                endTime: new Date().toISOString()
            });

            // 发送错误事件
            this.io.emit('process-error', { historyId, error: error.message });
        } finally {
            // 不清理临时目录，保留所有文件（包括config.json和JSON数据文件）以供任务重启使用
            if (tempConfigPath) {
                try {
                    const tempTaskDir = dirname(tempConfigPath);
                    if (existsSync(tempTaskDir)) {
                        console.log('📋 保留临时任务目录及所有文件以供任务重启使用');
                    }
                } catch (error) {
                    console.warn(`检查临时目录失败: ${error.message}`);
                }
            }
        }
    }

    /**
     * 清理临时目录
     */
    async cleanupTempDir(tempDir) {
        try {
            if (existsSync(tempDir)) {
                // 删除临时目录及其所有内容
                rmSync(tempDir, { recursive: true, force: true });
                console.log(`已清理临时目录: ${tempDir}`);
            }
        } catch (error) {
            console.error(`清理临时目录失败: ${error.message}`);
            // 不抛出错误，避免影响主流程
        }
    }

    /**
     * 创建临时配置
     */
    createTempConfig(excelPath, specificCaregivers, customConfig) {
        const defaultConfig = JSON.parse(readFileSync(join(rootDir, 'config.json'), 'utf8'));
        
        // 为每个任务创建独立的临时目录
        const taskId = new Date().toISOString().replace(/[:.]/g, '-');
        const tempDir = join(rootDir, 'temp', taskId);
        
        // 确保临时目录存在
        if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true });
        }
        
        // 创建空的JSON文件，确保每个任务都从空数组开始
        const emptyJsonFiles = {
            nurseObjs: join(tempDir, 'nurseObjs.json'),
            doctorObjs: join(tempDir, 'doctorObjs.json'),
            caregiverObjs: join(tempDir, 'caregiverObjs.json'),
            successfulUsers: join(tempDir, 'successfulUsers.json')
        };
        
        // 写入空数组到这些文件
        Object.values(emptyJsonFiles).forEach(filePath => {
            writeFileSync(filePath, '[]', 'utf8');
        });
        
        // 创建任务专用的错误日志文件
        const taskErrorLog = join(tempDir, 'error.log');
        writeFileSync(taskErrorLog, '', 'utf8');
        
        return {
            ...defaultConfig,
            files: {
                ...defaultConfig.files,
                excelFile: excelPath,
                nurseFile: emptyJsonFiles.nurseObjs,
                doctorFile: emptyJsonFiles.doctorObjs,
                caregiverFile: emptyJsonFiles.caregiverObjs,
                successFile: emptyJsonFiles.successfulUsers,
                errorLog: taskErrorLog
            },
            specificCaregivers: specificCaregivers || defaultConfig.specificCaregivers,
            tempDir: tempDir, // 保存临时目录路径，用于清理
            ...customConfig
        };
    }

    /**
     * 创建临时配置文件（用于验证）
     */
    createTempConfigFile(excelPath, specificCaregivers, customConfig, taskId = null) {
        const defaultConfig = JSON.parse(readFileSync(join(rootDir, 'config.json'), 'utf8'));
        
        // 生成任务ID：如果没有提供taskId，则基于文件名和护理员配置生成
        let actualTaskId;
        if (taskId) {
            actualTaskId = taskId;
        } else {
            // 基于Excel文件名和护理员配置生成固定ID
            const excelFileName = excelPath.split(/[/\\]/).pop().replace(/\.(xls|xlsx)$/i, '');
            const caregiversHash = specificCaregivers.sort().join('-').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
            actualTaskId = `${excelFileName}_${caregiversHash}`;
        }
        
        const tempTaskDir = join(rootDir, 'temp', actualTaskId);
        
        if (!existsSync(tempTaskDir)) {
            mkdirSync(tempTaskDir, { recursive: true });
        }
        
        // 初始化所有数据文件为空数组（任务开始时的初始状态）
        const dataFiles = ['nurseObjs.json', 'doctorObjs.json', 'caregiverObjs.json', 'successfulUsers.json'];
        
        for (const fileName of dataFiles) {
            const targetPath = join(tempTaskDir, fileName);
            
            // 检查文件是否已存在，如果不存在才创建
            if (!existsSync(targetPath)) {
                // 所有文件都从空数组开始
                // caregiverObjs.json 将在系统运行时根据 specificCaregivers 配置自动填充
                writeFileSync(targetPath, '[]');
                console.log(`📝 初始化空数据文件: ${fileName}`);
            } else {
                console.log(`📋 数据文件已存在，保持现有状态: ${fileName}`);
            }
        }
        
        // 创建临时配置对象
        // API配置完全由后端管理，不允许前端覆盖
        const tempConfig = {
            ...defaultConfig,
            files: {
                ...defaultConfig.files,
                excelFile: excelPath // 直接使用Excel文件的绝对路径
            },
            specificCaregivers: specificCaregivers || defaultConfig.specificCaregivers,
            // 只允许前端自定义这些非敏感配置
            personnel: {
                ...defaultConfig.personnel,
                ...(customConfig.personnel || {})
            },
            retry: {
                ...defaultConfig.retry,
                ...(customConfig.retry || {})
            },
            // API配置保持后端原始配置，不受前端影响
            api: defaultConfig.api,
            // 其他可自定义的配置项
            ...(customConfig.logging && { logging: customConfig.logging }),
            ...(customConfig.nursingItemIndices && { nursingItemIndices: customConfig.nursingItemIndices })
        };

        // 创建临时配置文件
        const tempConfigFilename = 'config.json';
        const tempConfigPath = join(tempTaskDir, tempConfigFilename);
        writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));
        
        console.log(`🔧 ${existsSync(tempTaskDir) ? '重用' : '创建'}临时任务目录: ${actualTaskId}`);
        
        // 返回配置文件路径和任务ID
        return { configPath: tempConfigPath, taskId: actualTaskId };
    }

    /**
     * 清理僵尸进程状态
     * 程序启动时检查是否有处理中的任务，将其标记为失败
     */
    cleanupStaleProcesses() {
        try {
            if (!existsSync(this.historyDir)) {
                return;
            }

            const historyFiles = readdirSync(this.historyDir)
                .filter(file => file.endsWith('.json'));

            let cleanedCount = 0;

            for (const file of historyFiles) {
                const filePath = join(this.historyDir, file);
                try {
                    const record = JSON.parse(readFileSync(filePath, 'utf8'));
                    
                    // 检查是否为处理中或重试中的状态
                    if (record.status === 'processing' || record.status === 'retrying') {
                        // 标记为失败
                        record.status = 'failed';
                        record.error = '系统重启导致任务中断';
                        record.endTime = new Date().toISOString();
                        record.systemRestart = true;

                        // 写回文件
                        writeFileSync(filePath, JSON.stringify(record, null, 2));
                        cleanedCount++;
                        
                        console.log(`🧹 清理僵尸任务: ${record.id || file.replace('.json', '')}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ 清理历史记录文件失败 ${file}: ${error.message}`);
                }
            }

            if (cleanedCount > 0) {
                console.log(`✅ 已清理 ${cleanedCount} 个僵尸任务状态`);
            } else {
                console.log(`✅ 无需清理僵尸任务`);
            }

        } catch (error) {
            console.warn(`⚠️ 清理僵尸进程状态失败: ${error.message}`);
        }
    }

    /**
     * 启动服务器
     */
    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 护理入住登记系统Web界面启动成功`);
            console.log(`📝 访问地址: http://localhost:${this.port}`);
            console.log(`📊 管理界面: http://localhost:${this.port}`);
            console.log(`🔌 WebSocket端口: ${this.port}`);
        });
    }
}

// 只有在直接运行此文件时才启动服务器
if (import.meta.url.endsWith('/webServer.js') || process.argv[1].endsWith('webServer.js')) {
    const webServer = new NursingWebServer();
    webServer.start();
}

export { NursingWebServer };
