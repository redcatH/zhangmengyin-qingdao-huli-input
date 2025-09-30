/**
 * 护理登记处理器
 * 核心业务逻辑处理类
 */
export class NursingProcessor {
    constructor(config, dataManager, personnelManager, apiClient, logger) {
        this.config = config;
        this.dataManager = dataManager;
        this.personnelManager = personnelManager;
        this.apiClient = apiClient;
        this.logger = logger;
        
        this.maxRetries = config.get('retry.maxRetries', 3);
        this.retryDelay = config.get('retry.delay', 1000);
        this.nursingItemIndices = config.get('nursingItemIndices', []);
    }

    /**
     * 处理单个用户的护理入住登记
     * @param {Object} user - 用户信息
     * @returns {Promise<{success: boolean, message: string}>} 处理结果
     */
    async processUser(user) {
        const username = user.name;
        
        // 检查是否已处理
        if (this.dataManager.isUserProcessed(username)) {
            return { success: true, message: `用户 ${username} 已处理，跳过`, skipped: true };
        }

        // 重试处理
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.debug(`处理用户 ${username}，第 ${attempt} 次尝试`);
                
                const result = await this.attemptUserRegistration(user);
                
                if (result.success) {
                    // 记录成功用户
                    this.dataManager.addSuccessfulUser(username);
                    return result;
                } else if (result.shouldRetry && attempt < this.maxRetries) {
                    this.logger.warn(`用户 ${username} 处理失败，将重试: ${result.message}`);
                    await this.sleep(this.retryDelay);
                    continue;
                } else {
                    return result;
                }

            } catch (error) {
                this.logger.error(`用户 ${username} 处理异常 (尝试 ${attempt}/${this.maxRetries}): ${error.message}`);
                
                if (attempt === this.maxRetries) {
                    return { 
                        success: false, 
                        message: `用户 ${username} 处理失败，已达最大重试次数: ${error.message}` 
                    };
                }
                
                await this.sleep(this.retryDelay);
            }
        }

        return { success: false, message: `用户 ${username} 处理失败` };
    }

    /**
     * 尝试用户登记
     * @param {Object} user - 用户信息
     * @returns {Promise<Object>} 处理结果
     */
    async attemptUserRegistration(user) {
        const username = user.name;

        try {
            // 1. 获取用户信息
            const userInfo = await this.apiClient.getUserInfo(username);
            if (!userInfo) {
                return { success: false, message: `无法获取用户信息: ${username}` };
            }

            // 2. 获取数据库时间
            const dbTime = await this.apiClient.getDatabaseTime();
            const formattedTime = parseInt(dbTime.split(" ")[0].replace(/-/g, ""), 10);

            // 3. 获取护理分类
            const nursingCategory = await this.apiClient.queryNursingCategory("01", "04");
            if (!nursingCategory || nursingCategory.length === 0) {
                return { success: false, message: "无法获取护理分类" };
            }

            const ckh059 = nursingCategory[0].ckh059;
            const ckh003 = nursingCategory[0].ckh003;

            // 4. 获取护理项目列表
            const classifyList = await this.apiClient.queryNursingClassifyList(ckh059);
            if (!classifyList || classifyList.length === 0) {
                return { success: false, message: "无法获取护理项目列表" };
            }

            // 筛选护理项目
            const kh04AddDTOList = this.selectNursingItems(classifyList);

            // 5. 获取和处理人员数据
            const personnelData = await this.apiClient.queryPersonnelList("H37021106950");
            if (!personnelData || personnelData.length === 0) {
                return { success: false, message: "无法获取人员列表" };
            }

            // 分类人员
            const nurses = personnelData.filter(p => p.ckh122 === "12");
            const doctors = personnelData.filter(p => p.ckh122 === "13");
            const caregivers = personnelData.filter(p => p.ckh122 === "10");

            // 更新人员管理器
            this.personnelManager.processPersonnelData(nurses, 'nurse', '12');
            this.personnelManager.processPersonnelData(doctors, 'doctor', '13');
            this.personnelManager.processPersonnelData(caregivers, 'caregiver', '10');

            // 6. 分配人员
            const nurseId = this.personnelManager.getAvailablePersonnel('nurse');
            const doctorId = this.personnelManager.getAvailablePersonnel('doctor');
            const caregiverId = this.personnelManager.getAvailablePersonnel('caregiver');

            if (!nurseId || !doctorId || !caregiverId) {
                return { 
                    success: false, 
                    message: `无法分配足够人员给用户 ${username}`,
                    details: { nurseId, doctorId, caregiverId }
                };
            }

            // 7. 构建登记数据
            const checkinData = this.buildCheckinData(userInfo, user, formattedTime, {
                kh04AddDTOList,
                ckh059,
                ckh003,
                nurseId,
                doctorId,
                caregiverId
            });

            // 8. 提交登记
            const result = await this.apiClient.submitNursingCheckin(checkinData);

            if (result.success) {
                // 更新人员计数
                this.personnelManager.updatePersonnelCount(nurseId, 'nurse');
                this.personnelManager.updatePersonnelCount(doctorId, 'doctor');
                this.personnelManager.updatePersonnelCount(caregiverId, 'caregiver');

                return { 
                    success: true, 
                    message: `用户 ${username} 登记成功`,
                    personnelAssigned: { nurseId, doctorId, caregiverId }
                };
            } else {
                // 检查是否需要重试
                const shouldRetry = this.handleRegistrationError(result, nurseId, doctorId);
                return { 
                    success: false, 
                    message: `用户 ${username} 登记失败: ${result.response}`,
                    shouldRetry
                };
            }

        } catch (error) {
            this.logger.error(`用户 ${username} 登记过程异常: ${error.message}`);
            throw error;
        }
    }

    /**
     * 筛选护理项目
     * @param {Array} classifyList - 护理项目列表
     * @returns {Array} 筛选后的项目列表
     */
    selectNursingItems(classifyList) {
        const kh04AddDTOList = [];
        
        for (const index of this.nursingItemIndices) {
            if (index < classifyList.length) {
                const item = classifyList[index];
                if (item && item.kh20DTOA && item.kh20DTOA.ckh048) {
                    kh04AddDTOList.push({ ckh048: item.kh20DTOA.ckh048 });
                }
            }
        }

        this.logger.debug(`筛选护理项目: ${kh04AddDTOList.length} 个项目`);
        return kh04AddDTOList;
    }

    /**
     * 构建登记数据
     * @param {Object} userInfo - 用户信息
     * @param {Object} user - 原始用户数据
     * @param {number} formattedTime - 格式化时间
     * @param {Object} params - 其他参数
     * @returns {Object} 登记数据
     */
    buildCheckinData(userInfo, user, formattedTime, params) {
        return {
            ckh002: userInfo.ckh002,
            aac002: userInfo.aac002,
            aac003: userInfo.aac003,
            aae030: formattedTime,
            aae031: null,
            aae013: null,
            kh04AddDTOList: params.kh04AddDTOList,
            ckh059: params.ckh059,
            ckh079: "",
            ckh099: params.doctorId,
            ckh500: params.nurseId,
            ckh600: params.caregiverId,
            ckh200: "",
            ckh003: params.ckh003,
            ckh173: null,
            ckh101: "",
            ckh281: user.ckh281,
            ckf181: user.ckf181,
            ckh122: "",
            ckh280: "",
            kh27DTOList: []
        };
    }

    /**
     * 处理登记错误
     * @param {Object} result - 登记结果
     * @param {string} nurseId - 护士ID
     * @param {string} doctorId - 医生ID
     * @returns {boolean} 是否应该重试
     */
    handleRegistrationError(result, nurseId, doctorId) {
        if (result.error && result.error.errorType) {
            switch (result.error.errorType) {
                case 'NURSE_LIMIT_REACHED':
                    this.personnelManager.markPersonnelFull(nurseId, 'nurse');
                    return true; // 可以重试
                case 'DOCTOR_LIMIT_REACHED':
                    this.personnelManager.markPersonnelFull(doctorId, 'doctor');
                    return true; // 可以重试
                default:
                    return false; // 其他错误不重试
            }
        }
        
        return false;
    }

    /**
     * 批量处理用户
     * @param {Array} users - 用户列表
     * @param {Function} progressCallback - 进度回调
     * @returns {Promise<Object>} 处理统计
     */
    async batchProcessUsers(users, progressCallback = null) {
        const stats = {
            total: users.length,
            success: 0,
            failed: 0,
            skipped: 0
        };

        const failedUsers = [];

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            this.logger.info(`处理用户 ${i + 1}/${users.length}: ${user.name}`);

            try {
                const result = await this.processUser(user);

                if (result.success) {
                    if (result.skipped) {
                        stats.skipped++;
                    } else {
                        stats.success++;
                    }
                } else {
                    stats.failed++;
                    failedUsers.push({
                        name: user.name,
                        error: result.message
                    });
                }

                // 进度回调
                if (progressCallback) {
                    progressCallback(i + 1, stats);
                }

                // 每10个用户输出一次进度
                if ((i + 1) % 10 === 0) {
                    this.logger.logProgress(i + 1, users.length, stats.success, stats.failed);
                }

            } catch (error) {
                stats.failed++;
                failedUsers.push({
                    name: user.name,
                    error: error.message
                });
                this.logger.error(`处理用户 ${user.name} 时发生未捕获异常: ${error.message}`);
            }
        }

        return { stats, failedUsers };
    }

    /**
     * 休眠函数
     * @param {number} ms - 毫秒数
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 预检查系统状态
     * @returns {Promise<{ready: boolean, issues: Array}>} 检查结果
     */
    async preflightCheck() {
        const issues = [];

        try {
            // 检查API连接
            const apiHealthy = await this.apiClient.healthCheck();
            if (!apiHealthy) {
                issues.push('API连接异常');
            }

            // 检查人员状态
            const personnelStats = this.personnelManager.getPersonnelStats();
            if (personnelStats.nurses.available === 0) {
                issues.push('没有可用护士');
            }
            if (personnelStats.doctors.available === 0) {
                issues.push('没有可用医生');
            }
            if (personnelStats.caregivers.available === 0) {
                issues.push('没有可用护理员');
            }

            return {
                ready: issues.length === 0,
                issues,
                personnelStats
            };

        } catch (error) {
            issues.push(`预检查异常: ${error.message}`);
            return { ready: false, issues };
        }
    }
}
