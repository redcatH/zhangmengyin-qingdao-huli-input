
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import xlsx from 'xlsx';
var filepath = "入住表（刘毅用）9月.xls"
var token = "SESSION=ZTVlOTgxYWUtMzQ3Mi00ZjA4LWJjMzgtZGYyZmZjMmUzYWJk"
var specificNames = 
 [
  "张梅",
  "卢秀萍",
  "刘建贞",
  "刘同花",
  "刘同秀",
  "刘岩",
  "刘俊伟",
  "薛红",
  "薛光艳",
  "刘艳华",
  "薛玉英",
  "郎庆芳",
  "郭爱辉",
  "泮瑞英",
  "王甜甜",
  "于永香",
  "倪晓光",
  "营亮平",
  "王洁",
  "张本文",
  "刘香",
  "殷玉庆"
];

// File paths
const nurseObjsFile = join(__dirname, 'nurseObjs.json');
const doctorObjsFile = join(__dirname, 'doctorObjs.json');
const caregiverObjsFile = join(__dirname, 'caregiverObjs.json');

// Read objects from files
var nurseObjsFull = readJsonFile(nurseObjsFile) || []; // Initialize as empty array if file doesn't exist
var doctorObjsFull = readJsonFile(doctorObjsFile) || [];
var caregiverObjsFull = readJsonFile(caregiverObjsFile) || [];
/**
 * 发送护理入住登记请求
 * @param {string} ckh002 - 登记号
 * @param {string} aac002 - 身份证号
 * @param {string} aac003 - 姓名
 * @param {number} aae030 - 入院日期（格式：YYYYMMDD）
 * @param {Array<{ckh048: string}>} kh04AddDTOList - 护理项目列表
 * @param {number} ckh059 - 护理等级
 * @param {number} ckh099 - 机构ID
 * @param {number} ckh500 - 科室ID
 * @param {number} ckh600 - 病区ID
 * @param {string} ckh003 - 入住类型
 * @param {string} ckh281 - # 切开气管：否   "ckh281":"0"   是"ckh281":"1",
 * @param {string} ckf181 - # "ckf181":"05"家护（失能）   家护（门诊慢特病）"ckf181":"06",
 * @returns {Promise<any>} 请求响应数据
 */
function sendNursingCheckIn(
    ckh002,
    aac002,
    aac003,
    aae030,
    kh04AddDTOList,
    ckh059,
    ckh099,
    ckh500,
    ckh600,
    ckh003,
    ckh281,
    ckf181
) {
    const requestBody = {
        ckh002,
        aac002,
        aac003,
        aae030,
        aae031: null,
        aae013: null,
        kh04AddDTOList,
        ckh059,
        ckh079: "",
        ckh099,
        ckh500,
        ckh600,
        ckh200: "",
        ckh003,
        ckh173: null,
        ckh101: "",
        ckh281,
        ckf181,
        ckh122: "",
        ckh280: "",
        kh27DTOList: []
    };

    return fetch("http://test.vssh.top/api/rest/nursing/kh01/checkIn", {
        method: "POST",
        headers: {
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
            "content-type": "application/json;charset=UTF-8",
            "cookie": token,
            "Referer": "http://10.78.226.94:8080/",
            "Referrer-Policy": "no-referrer-when-downgrade"
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    const error = new Error(`HTTP error! status: ${response.status}`);
                    error.responseBody = text;
                    throw error;
                });
            }
            return response.text();
        });
}

async function GetUser(userName) {
    try {
        const response = await fetch("http://test.vssh.top/api/rest/nursing/kh01/selectPlanAlreadyMade", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                "content-type": "application/json;charset=UTF-8",
                "cookie": token,
                "Referer": "http://10.78.226.94:8080/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: JSON.stringify({
                ckh004: "01",
                cka025: 370284,
                aaa027: "",
                ckh005: "H37021106950",
                deptName: "黄岛远保康诊所",
                aac002: "",
                aac003: userName,
                ckh003: "",
                ckg066: "",
                ckh280: "",
                ckh079: "",
                ckh101: "",
                ckf181: "",
                pageNum: 1,
                pageSize: 10,
                isOver: true
            }),
            method: "POST"
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.responseBody = errorText;
            throw error;
        }

        return await response.json();
    } catch (error) {
        console.error("Error in GetUser:", error);
        throw error;
    }
}


async function getTime() {
    try {
        const response = await fetch("http://test.vssh.top/api/rest/sys/getDatabaseTime/getTime", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                "cookie": token,
                "Referer": "http://10.78.226.94:8080/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            method: "GET"
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.responseBody = errorText;
            throw error;
        }

        const data = await response.json();
        console.log("Database time:", data);
        return data;
    } catch (error) {
        console.error("Error fetching database time:", error);
        throw error;
    }
}


/**
 * 查询护理分类列表
 * @param {number} ckh059 - 护理等级
 * @returns {Promise<any>} 请求响应数据
 */
async function queryNursingClassifyList(ckh059) {
    try {
        const response = await fetch("http://test.vssh.top/api/rest/nursing/kh18/queryKH20ClassifyList", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                "content-type": "application/json;charset=UTF-8",
                "cookie": token,
                "Referer": "http://10.78.226.94:8080/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: JSON.stringify({ ckh059 }),
            method: "POST"
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.responseBody = errorText;
            throw error;
        }

        return await response.json();
    } catch (error) {
        console.error("Error in queryNursingClassifyList:", error);
        throw error;
    }
}

/**
 * 查询护理分类
 * @param {string} ckh003 - 入住类型
 * @param {string} ckh057 - 分类代码
 * @returns {Promise<any>} 请求响应数据
 */
async function queryNursingCategory(ckh003, ckh057) {
    try {
        const response = await fetch("http://test.vssh.top/api/rest/nursing/kh18/queryKH18", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                "content-type": "application/json;charset=UTF-8",
                "cookie": token,
                "Referer": "http://10.78.226.94:8080/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: JSON.stringify({ ckh003, ckh057 }),
            method: "POST"
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.responseBody = errorText;
            throw error;
        }

        return await response.json();
    } catch (error) {
        console.error("Error in queryNursingCategory:", error);
        throw error;
    }
}

/**
 * 查询护理列表
 * @param {string} ckf020 - 参数值
 * @returns {Promise<any>} 请求响应数据
 */
async function queryNursingList(ckf020) {
    try {
        const response = await fetch("http://test.vssh.top/api/rest/sys/kh34/queryKH34List", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                "content-type": "application/json;charset=UTF-8",
                "cookie": token,
                "Referer": "http://10.78.226.94:8080/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: JSON.stringify({ ckf020: ckf020 }),
            method: "POST"
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.responseBody = errorText;
            throw error;
        }

        return await response.json();
    } catch (error) {
        console.error("Error in queryNursingList:", error);
        throw error;
    }
}

const excelFilePath = join(__dirname, filepath); // Replace with your Excel file path

// 读取 Excel 文件
function readExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 读取第一个工作表
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // 转换为二维数组
    return data.slice(1); // 从第二行开始读取数据
}

const excelData = readExcel(excelFilePath);
console.log("Excel data:", excelData);

// 将 Excel 数据转换为用户列表
var userList = excelData.map(row => {
    // * @param {string} ckh281 - # 切开气管：否   "ckh281":"0"   是"ckh281":"1",
    // * @param {string} ckf181 - # "ckf181":"05"家护（失能）   家护（门诊慢特病）"ckf181":"06",
    var ckf181Temp = "";
    if (row[2] == '家护（失能）') {
        ckf181Temp = "05"; // 如果是家护（失能），则设置为 "05"
    } else if (row[2] == '家护（门诊慢特病）') {
        ckf181Temp = "06"; // 如果是家护（门诊慢特病），则设置为 "06"
    } else {
        // 异常
        console.error(`Unknown category for user ${row[1]}: ${row[2]}`);
    }
    return {
        name: row[1], // 第一列是名字 
        ckf181: ckf181Temp,        // 第二列是 x  家护（门诊慢特病）   家护（失能） 
        ckh281: row[3] == '是' ? 1 : '0'         // 第三列是 y 是 否
    }
});

const successfulUsersFile = join(__dirname, 'successfulUsers.json');

// 读取已成功用户列表
let successfulUsers = [];
if (existsSync(successfulUsersFile)) {
    try {
        const data = readFileSync(successfulUsersFile, 'utf8');
        successfulUsers = JSON.parse(data);
    } catch (error) {
        console.error("Error reading successful users file:", error);
    }
}

var ignoredUsers = []; // 忽略的用户列表
var ignoredyishi = []; // 忽略的用户列表
// 处理用户列表
for (let user of userList) {
    if (successfulUsers.includes(user.name)) {
        console.log(`Skipping ${user.name}, already processed successfully.`);
        continue;
    }
    if(user.name == undefined){
        console.log(`Skipping user with undefined name.`);
        continue;
    }
    var f = true;
    while (f) {
        var f = false;
        await processNursingCheckIn(user.name, user.ckh281, user.ckf181) // 这里的 "0" 和 "05" 是示例值，请根据实际需要调整
            .then(response => {
                if (!successfulUsers.includes(user.name)) {
                    successfulUsers.push(user.name);
                    console.log(`Process successful for ${user.name}:`, response);

                    // 保存成功用户到文件
                    try {
                        writeFileSync(successfulUsersFile, JSON.stringify(successfulUsers, null, 2), 'utf8');
                    } catch (error) {

                        console.error("Error saving successful users file:", error);
                    }
                }
            })
            .catch(error => {
                console.error(`Error processing ${user.name}:`, error);
                if (error.message == "责任护士人数已达上限，无法选择该护士为责任护士") {
                    ignoredUsers.push(nurseId)
                    f = true;
                }else if(error.message == "该责任医师负责人数已达80人，入住时不能选择该医师为责任医师"){
                    f = true;
                    ignoredyishi.push(doctorId)
                }
            });
    }

}

var nurseId // 护士ID    所有护士都可选，并且每个护士可以等级50个人，
var doctorId // 医生ID  所有医生都可选，并且每个医生可以等级80个人，
var caregiverId  // 护理员ID 护理员可选需要固定，并且每个护理员可以等级30个人，
/**
 * 发送护理入住登记请求
 * @param {string} userName - 
 * @param {string} ckh281 - # 切开气管：否   "ckh281":"0"   是"ckh281":"1",
 * @param {string} ckf181 - # "ckf181":"05"家护（失能）   家护（门诊慢特病）"ckf181":"06",
 * @returns {Promise<any>} 请求响应数据
 */
// "ckf181":"05"家护（失能）   家护（门诊慢特病）"ckf181":"06",
async function processNursingCheckIn(userName, ckh281, ckf181) {
    try {
        var data = await GetUser(userName);
        if (!data || !data.list || data.list.length === 0) {
            throw new Error("No user data found.");
        }

        var aac003 = data.list[0].aac003;
        var aac002 = data.list[0].aac002;
        var ckh002 = data.list[0].ckh002;

        var times = await getTime();
        var formattedTime = times.split(" ")[0].replace(/-/g, "");

        var NursingCategory = await queryNursingCategory("01", "04");
        if (!NursingCategory || NursingCategory.length === 0) {
            throw new Error("No nursing category found.");
        }

        var ckh059Temp = NursingCategory[0].ckh059;
        var ckh003Temp = NursingCategory[0].ckh003;
        var list = await queryNursingClassifyList(ckh059Temp);
        var kh04AddDTOList = list
            .filter((item, index) => [1 - 1, 2 - 1, 10 - 1, 12 - 1, 14 - 1, 15 - 1, 16 - 1, 23 - 1, 28 - 1, 29 - 1, 30 - 1, 59 - 1].includes(index))
            .map(item => ({ ckh048: item.kh20DTOA.ckh048 }));

        var peoples = await queryNursingList("H37021106950");
        var nurses = peoples.filter(person => person.ckh122 === "12");
        var doctors = peoples.filter(person => person.ckh122 === "13");
        var caregivers = peoples.filter(person => person.ckh122 === "10");
        // console.log("护理员:" + caregiver.length);
        caregivers = caregivers.filter(person =>
            person.ckh122 === "10" && specificNames.some(name => person.aac003.includes(name + "-"))
        );
        var nurseObjs = processItems(nurses, nurseObjsFull, "ckh174");
        var doctorObjs = processItems(doctors, doctorObjsFull, "ckh174");
        var caregiverObjs = processItems(caregivers, caregiverObjsFull, "ckh174");
        doctorObjs = doctorObjs.filter(p=> !ignoredyishi.includes(p.id))
        nurseObjs = nurseObjs.filter(nurse => !ignoredUsers.includes(nurse.id));

        console.log("候选:" + specificNames.length);

        if (!nurseObjs.length || !doctorObjs.length || !caregiverObjs.length) {
            throw new Error("Required roles (nurse, doctor, caregiver) not found in peoples list.");
        }
        // 获取护士、医生和护理员的ID
        nurseId = nurseObjs[0].id; // 护士ID    所有护士都可选，并且每个护士可以等级50个人，
        doctorId = doctorObjs[0].id; // 医生ID  所有医生都可选，并且每个医生可以等级80个人，
        caregiverId = caregiverObjs[0].id; // 护理员ID 护理员可选需要固定，并且每个护理员可以等级30个人，



        const response = await sendNursingCheckIn(
            ckh002,
            aac002,
            aac003,
            parseInt(formattedTime, 10),
            kh04AddDTOList,
            ckh059Temp,
            doctorId,
            nurseId,
            caregiverId,
            ckh003Temp,
            ckh281, // 切开气管
            ckf181
        );
        //如果响应数据包含 "本次业务办理成功" 则表示请求成功
        if (!response.includes("本次业务办理成功")) {
            throw new Error(`Request failed for ${userName}: ${response}`);
        }
        // After a successful response
        if (response.includes("本次业务办理成功")) {
            // Update counts for nurseId, doctorId, and caregiverId
            updateCountAndStore(nurseObjsFull, nurseId, nurseObjsFile);
            updateCountAndStore(doctorObjsFull, doctorId, doctorObjsFile);
            updateCountAndStore(caregiverObjsFull, caregiverId, caregiverObjsFile);
            console.log("Counts updated and stored successfully.");
        }

        console.log("Request successful:", response);
        return response;
    } catch (error) {
        if (error)
            console.error("Error in processNursingCheckIn:", error);
        const errorLogFile = join(__dirname, 'error.log');
        if (error.responseBody) {
            if (error.responseBody.includes("该责任护士负责人数已达50人，入住时不能选择该护士为责任护士")) {
                throw new Error("责任护士人数已达上限，无法选择该护士为责任护士");
            }
            if (error.responseBody.includes("该责任医师负责人数已达80人，入住时不能选择该医师为责任医师")) {
                throw new Error("该责任医师负责人数已达80人，入住时不能选择该医师为责任医师");
            }
        }
        let errorMessage = `${userName} [${new Date().toISOString()}] Error: ${error.message}\n`;
        if (error.responseBody) {
            errorMessage += `Response Body: ${error.responseBody}\n`;
        }

        writeFileSync(errorLogFile, errorMessage, { flag: 'a' }); // Append to the log file

        throw error; // Re-throw the error to be handled by the caller
    }
}





/**
 * Updates the count for a specific ID in the object array and writes the updated array to a file.
 * @param {Array<{id: string, count: number}>} objArray - The array of objects to update.
 * @param {string} id - The ID to update.
 * @param {string} filePath - The file path to store the updated array.
 */
function updateCountAndStore(objArray, id, filePath) {
    const obj = objArray.find(item => item.id === id);
    if (obj) {
        obj.count += 1; // Increment the count
    } else {
        console.warn(`ID ${id} not found in the object array.`);
    }
    writeJsonFile(filePath, objArray); // Save the updated array to the file
}

/**
 * 对数组排序，根据对象的 count 值排序
 * @param {Array<{id: string, count: number}>} array - 要排序的数组
 * @returns {Array<{id: string, count: number}>} 排序后的数组
 */
function sortByCount(array) {
    return array.sort((a, b) => a.count - b.count);
}

/**
 * Processes a list of items and updates the corresponding object array.
 * @param {Array} items - The list of items to process.
 * @param {Array} objArray - The array of objects to update.
 * @param {string} idKey - The key to use for identifying items (e.g., "ckh174").
 * @returns {Array} Updated object array.
 */
function processItems(items, objArray, idKey) {
    for (let item of items) {
        const existing = objArray.find(obj => obj.id === item[idKey]);
        if (existing) {
            console.log(`Skipping caregiver with ID ${item[idKey]}, already exists.`);
            continue;
        }
        objArray.push({ id: item[idKey], count: 0 });
    }
    return sortByCount(objArray);
}

/**
 * Reads a JSON file and parses its content.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Array} Parsed content of the file or an empty array if the file doesn't exist.
 */
function readJsonFile(filePath) {
    if (existsSync(filePath)) {
        try {
            return JSON.parse(readFileSync(filePath, 'utf8'));
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
        }
    }
    return [];
}

/**
 * Writes data to a JSON file. If the file does not exist, it will be created. If it exists, it will be overwritten.
 * @param {string} filePath - The path to the JSON file.
 * @param {Array} data - The data to write to the file.
 */
function writeJsonFile(filePath, data) {
    try {
        writeFileSync(filePath, JSON.stringify(data, null, 2), { flag: 'w' }); // 'w' ensures the file is overwritten
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
    }
}