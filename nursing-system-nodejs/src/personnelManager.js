/**
 * 人员管理类
 * 负责护士、医生、护理员的分配和计数管理
 */
export class PersonnelManager {
    constructor(config, dataManager, logger) {
        this.config = config;
        this.dataManager = dataManager;
        this.logger = logger;
        
        // 加载人员数据
        this.nurses = this.dataManager.readJsonFile('nurseFile');
        this.doctors = this.dataManager.readJsonFile('doctorFile');
        this.caregivers = this.dataManager.readJsonFile('caregiverFile');
        
        // 忽略列表（已达上限的人员）
        this.ignoredNurses = new Set();
        this.ignoredDoctors = new Set();
        
        this.logger.info(`加载人员数据 - 护士: ${this.nurses.length}, 医生: ${this.doctors.length}, 护理员: ${this.caregivers.length}`);
    }

    /**
     * 处理人员数据，初始化或更新人员列表
     * @param {Array} personnelList - 从API获取的人员列表
     * @param {string} role - 角色类型 ('nurse', 'doctor', 'caregiver')
     * @param {string} roleCode - 角色代码 ('12', '13', '10')
     */
    processPersonnelData(personnelList, role, roleCode) {
        let existingData, fileKey;
        
        switch (role) {
            case 'nurse':
                existingData = this.nurses;
                fileKey = 'nurseFile';
                break;
            case 'doctor':
                existingData = this.doctors;
                fileKey = 'doctorFile';
                break;
            case 'caregiver':
                existingData = this.caregivers;
                fileKey = 'caregiverFile';
                // 筛选指定护理员
                personnelList = this.filterSpecificCaregivers(personnelList);
                break;
            default:
                this.logger.error(`未知角色类型: ${role}`);
                return [];
        }

        const processedList = [];
        
        for (const person of personnelList) {
            const personId = person.ckh174;
            if (!personId) continue;

            // 检查是否已存在
            const existing = existingData.find(item => item.id === personId);
            if (existing) {
                processedList.push(existing);
            } else {
                const newPerson = { id: personId, count: 0 };
                processedList.push(newPerson);
                this.logger.debug(`新增${role}: ${personId}`);
            }
        }

        // 按计数排序
        processedList.sort((a, b) => a.count - b.count);
        
        // 更新内存中的数据
        if (role === 'nurse') {
            this.nurses = processedList;
        } else if (role === 'doctor') {
            this.doctors = processedList;
        } else if (role === 'caregiver') {
            this.caregivers = processedList;
        }

        this.logger.info(`处理${role}数据完成，共 ${processedList.length} 人`);
        return processedList;
    }

    /**
     * 筛选指定的护理员
     * @param {Array} caregiverList - 护理员列表
     * @returns {Array} 筛选后的护理员列表
     */
    filterSpecificCaregivers(caregiverList) {
        const specificNames = this.config.get('specificCaregivers', []);
        
        const filtered = caregiverList.filter(caregiver => {
            const name = caregiver.aac003 || '';
            return specificNames.some(specificName => name.includes(specificName + '-'));
        });

        this.logger.info(`筛选护理员: 原始${caregiverList.length}人，筛选后${filtered.length}人`);
        return filtered;
    }

    /**
     * 获取可用人员ID
     * @param {string} role - 角色类型
     * @returns {string|null} 人员ID
     */
    getAvailablePersonnel(role) {
        let availableList, limit, ignoredSet;

        switch (role) {
            case 'nurse':
                availableList = this.nurses;
                limit = this.config.get('personnel.nursesLimit', 50);
                ignoredSet = this.ignoredNurses;
                break;
            case 'doctor':
                availableList = this.doctors;
                limit = this.config.get('personnel.doctorsLimit', 80);
                ignoredSet = this.ignoredDoctors;
                break;
            case 'caregiver':
                availableList = this.caregivers;
                limit = this.config.get('personnel.caregiversLimit', 30);
                ignoredSet = new Set(); // 护理员暂不实现忽略机制
                break;
            default:
                this.logger.error(`未知角色类型: ${role}`);
                return null;
        }

        // 查找可用人员
        const available = availableList.find(person => 
            !ignoredSet.has(person.id) && person.count < limit
        );

        if (available) {
            this.logger.debug(`分配${role}: ${available.id} (当前负责: ${available.count}/${limit})`);
            return available.id;
        }

        this.logger.warn(`没有可用的${role}`);
        return null;
    }

    /**
     * 更新人员计数
     * @param {string} personId - 人员ID
     * @param {string} role - 角色类型
     */
    updatePersonnelCount(personId, role) {
        let personnelList, fileKey;

        switch (role) {
            case 'nurse':
                personnelList = this.nurses;
                fileKey = 'nurseFile';
                break;
            case 'doctor':
                personnelList = this.doctors;
                fileKey = 'doctorFile';
                break;
            case 'caregiver':
                personnelList = this.caregivers;
                fileKey = 'caregiverFile';
                break;
            default:
                this.logger.error(`更新计数失败，未知角色: ${role}`);
                return false;
        }

        const person = personnelList.find(p => p.id === personId);
        if (person) {
            person.count += 1;
            
            // 重新排序
            personnelList.sort((a, b) => a.count - b.count);
            
            // 保存到文件
            const success = this.dataManager.writeJsonFile(fileKey, personnelList);
            if (success) {
                this.logger.debug(`${role} ${personId} 计数更新为 ${person.count}`);
                return true;
            }
        } else {
            this.logger.error(`未找到${role}: ${personId}`);
        }

        return false;
    }

    /**
     * 标记人员已达上限
     * @param {string} personId - 人员ID
     * @param {string} role - 角色类型
     */
    markPersonnelFull(personId, role) {
        switch (role) {
            case 'nurse':
                this.ignoredNurses.add(personId);
                this.logger.warn(`护士 ${personId} 已达上限，加入忽略列表`);
                break;
            case 'doctor':
                this.ignoredDoctors.add(personId);
                this.logger.warn(`医生 ${personId} 已达上限，加入忽略列表`);
                break;
            default:
                this.logger.warn(`不支持标记${role}为已满`);
        }
    }

    /**
     * 获取人员统计信息
     * @returns {Object} 统计信息
     */
    getPersonnelStats() {
        const nursesLimit = this.config.get('personnel.nursesLimit', 50);
        const doctorsLimit = this.config.get('personnel.doctorsLimit', 80);
        const caregiversLimit = this.config.get('personnel.caregiversLimit', 30);

        return {
            nurses: {
                total: this.nurses.length,
                available: this.nurses.filter(n => !this.ignoredNurses.has(n.id) && n.count < nursesLimit).length,
                ignored: this.ignoredNurses.size,
                totalCapacity: this.nurses.length * nursesLimit,
                usedCapacity: this.nurses.reduce((sum, n) => sum + n.count, 0)
            },
            doctors: {
                total: this.doctors.length,
                available: this.doctors.filter(d => !this.ignoredDoctors.has(d.id) && d.count < doctorsLimit).length,
                ignored: this.ignoredDoctors.size,
                totalCapacity: this.doctors.length * doctorsLimit,
                usedCapacity: this.doctors.reduce((sum, d) => sum + d.count, 0)
            },
            caregivers: {
                total: this.caregivers.length,
                available: this.caregivers.filter(c => c.count < caregiversLimit).length,
                ignored: 0,
                totalCapacity: this.caregivers.length * caregiversLimit,
                usedCapacity: this.caregivers.reduce((sum, c) => sum + c.count, 0)
            }
        };
    }

    /**
     * 批量更新人员计数
     * @param {Array} updates - 更新列表 [{personId, role}]
     */
    batchUpdateCounts(updates) {
        const results = [];
        
        for (const { personId, role } of updates) {
            const success = this.updatePersonnelCount(personId, role);
            results.push({ personId, role, success });
        }

        return results;
    }

    /**
     * 重置忽略列表
     */
    resetIgnoredLists() {
        this.ignoredNurses.clear();
        this.ignoredDoctors.clear();
        this.logger.info('已重置人员忽略列表');
    }
}
