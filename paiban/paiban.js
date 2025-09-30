
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import xlsx from 'xlsx';
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
// dotenv.config()
import { setGlobalDispatcher, ProxyAgent } from "undici";
try {
    

// const httpDispatcher = new ProxyAgent({ uri: "http://127.0.0.1:8888" });
// setGlobalDispatcher(httpDispatcher);

} catch (error) {
    console.error("Error loading .env file:", error);
}

async function fetchSchedulePlan(aac003, ckh005 = "H37021106950", orgName = "黄岛远保康诊所", aaz289 = "370284", pageSize = 10, pageNum = 1, aac002 = "", cka025 = 370284) {
    const url = "http://test.vssh.top/api/rest/nursing/kh01/selectWaitSchedualPlan";
    const headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "cookie": cookie,
        "Referer": "http://test.vssh.top/",
        "Referrer-Policy": "no-referrer-when-downgrade"
    };
    const body = JSON.stringify({
        aac003,
        ckh005,
        orgName,
        aac002,
        aaz289: parseInt(aaz289, 10),
        pageSize,
        pageNum,
        cka025
        });

    const response = await fetch(url, {
        method: "POST",
        headers,
        body
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// 8.txt
async function fetchKH01Detail(ckh002, ckh001, isOrg = "true") {
    const url = "http://test.vssh.top/api/rest/nursing/kh01/selectKH01Detail";
    const headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "cookie": cookie,
        "Referer": "http://test.vssh.top/",
        "Referrer-Policy": "no-referrer-when-downgrade"
    };
    const body = JSON.stringify({
        ckh002,
        ckh001,
        isOrg
    });

    const response = await fetch(url, {
        method: "POST",
        headers,
        body
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// 9.txt
async function fetchKH20ClassifyList(ckh059, ckh001) {
    const url = "http://test.vssh.top/api/rest/nursing/kh18/queryKH20ClassifyList";
    const headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "cookie": cookie,
        "Referer": "http://test.vssh.top/",
        "Referrer-Policy": "no-referrer-when-downgrade"
    };
    const body = JSON.stringify({ ckh059, ckh001 });

    const response = await fetch(url, {
        method: "POST",
        headers,
        body
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

//10 获取所有护士 和 护理员 , 参数可以固定
async function fetchKH34List(ckf020 = "H37021106950") {
    const url = "http://test.vssh.top/api/rest/sys/kh34/queryKH34List";
    const headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "cookie": cookie,
        "Referer": "http://test.vssh.top/",
        "Referrer-Policy": "no-referrer-when-downgrade"
    };
    const body = JSON.stringify({ ckf020 });

    const response = await fetch(url, {
        method: "POST",
        headers,
        body
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

//12 提交
async function scheduleNursing(ckh024, ckh025, ckh001, list) {
    try {
        const url = "http://test.vssh.top/api/rest/nursing/kh06/scheduling";
        const headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
            "content-type": "application/json;charset=UTF-8",
            "cookie": cookie,
            "Referer": "http://test.vssh.top/",
            "Referrer-Policy": "no-referrer-when-downgrade"
        };
        const body = JSON.stringify({ ckh024, ckh025, ckh001, list });

        const response = await fetch(url, {
            method: "POST",
            headers,
            body
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseBody = await response.text();
        console.log("Response body:", responseBody);
        return parseInt(responseBody, 10);
    } catch (error) {
        throw error;
    }

}

function generateDaysOfMonth(year, month) {
    const days = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
        const day = date.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}${month.toString().padStart(2, '0')}${day}`;
        days.push(formattedDate);
        date.setDate(date.getDate() + 1);
    }
    return days;
}

function getSuccessfulUsers() {
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
    return successfulUsers;
}

const excelFilePath = join(__dirname, '程序员8月排班表.xlsx'); // Replace with your Excel file path
// 读取 Excel 文件
function readExcel(filePath) {

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 读取第一个工作表
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // 转换为二维数组
    return data.slice(1); // 从第3行开始读取数据
}

function getUserListFromExcel(filePath) {
    const excelData = readExcel(filePath);
    console.log("Excel data:", excelData);
    const userList = excelData.map(row => {
        const name = row[0]; // 第一列是名字
        const hushis = row.slice(1); // 剩下的列
        return { name, hushis };
    });
    return userList;
}


async function copyYesterdayKh07(ckh001, ckh020,ckh025) {
    const url = "http://test.vssh.top/api/rest/nursing/kh07/copyYesterdayKh07";
    const headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "cookie": cookie,
        "Referer": "http://test.vssh.top/",
        "Referrer-Policy": "no-referrer-when-downgrade"
    };
    const body = JSON.stringify({ ckh001, ckh020,ckh025 });

    const response = await fetch(url, {
        method: "POST",
        headers,
        body
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.text();
    const isSuccessful = result === "true" || result === true; // Convert result to boolean
    if (isSuccessful) {
        console.log("Operation successful.");
    } else {
        console.log("Operation failed.");
    }

    return isSuccessful;
}

const cookie = "SESSION=NzliNmYyMjAtNzU3My00ZmRhLWJhMDktZjg5ZDc4OTJjMjg3";
const userList = getUserListFromExcel(excelFilePath);
console.log("User list:", userList);
const daysInMay2025 = generateDaysOfMonth(2025, 8).slice(0, -1);
console.log(daysInMay2025);
var successfulUsers = getSuccessfulUsers() ||[]


for (let user of userList) {
    try {
        if (successfulUsers.includes(user.name)) {
            console.log(`Skipping ${user.name}, already processed successfully.`);
            continue;
        }
    
        var userDetails = await fetchSchedulePlan(user.name)
        if(userDetails.list.length == 0) {
            const logFilePath = join(__dirname, 'processedUsers.log');
    
            // 检查日志文件是否存在，如果不存在则创建
            if (!existsSync(logFilePath)) {
                writeFileSync(logFilePath, '', 'utf8');
            }
    
            // 将当前用户写入日志文件
            try {
                const logData = `${user.name}\n`;
                writeFileSync(logFilePath, logData, { flag: 'a' }); // 追加写入
                console.log(`Logged ${user.name} to processedUsers.log`);
            } catch (error) {
                console.error("Error writing to log file:", error);
            }
            continue; // 如果没有找到用户详情，跳过当前用户
        }
        var userDetail = userDetails.list[0];
        var ckh001 = userDetail.ckh001; // 获取 ckh001
        var ckh002 = userDetail.ckh002; // 获取 ckh002
        var kexuan = await fetchKH01Detail(ckh002, ckh001, "true")
        var quanbu = await fetchKH20ClassifyList(kexuan.kh01DTO.ckh059, ckh001);
    
        var kexuanTemp = [];
        for (let item of quanbu) {
            if (kexuan.kh01DTO.kh04DTOList.find(p => p.ckh048 == item.kh20DTOA.ckh048)) {
                kexuanTemp.push(item)
            }
        }
        var ids = kexuanTemp
            .filter((item, index) => [1 - 1, 3 - 1, 6 - 1, 7 - 1, 9 - 1, 10 - 1].includes(index))
            .map(item => item.kh20DTOA.ckh048 );
    
        var hushi = await fetchKH34List();
        var t = 0;

        // 检查所有护士是否存在
        const missingHushis = user.hushis.filter(item => !hushi.some(p => p.aac003.includes(item + "-")));
        if (missingHushis.length > 0) {
            console.log(`Nurses ${missingHushis.join(", ")} not found for user ${user.name}`);
            
            // 写入文件
            const missingHushisFilePath = join(__dirname, 'missingHushis.log');

            // 检查文件是否存在，如果不存在则创建
            if (!existsSync(missingHushisFilePath)) {
                writeFileSync(missingHushisFilePath, '', 'utf8');
            }

            // 将未找到的护士信息写入文件
            try {
                const logData = `User: ${user.name}, Missing Nurses: ${missingHushis.join(", ")}\n`;
                writeFileSync(missingHushisFilePath, logData, { flag: 'a' }); // 追加写入
                console.log(`Logged missing nurses for ${user.name} to missingHushis.log`);
            } catch (error) {
                console.error("Error writing to missingHushis log file:", error);
            }
            throw new Error(`Nurses ${missingHushis.join(", ")} not found for user ${user.name}`);
        }


        for (let item of user.hushis) {
            var h = hushi.find(p => p.aac003.includes(item + "-"));
            t = await scheduleNursing(h.ckh174, daysInMay2025[0], ckh001, ids);
            console.log(`Scheduled ` + t);
        }
        for (let day of daysInMay2025.slice(1)) {
            // 复制昨天的排班
            const isCopied = await copyYesterdayKh07(ckh001,t, day);
            if (!isCopied) {
                console.log(`Failed to copy yesterday's schedule for ${user.name} on ${day}`);
                continue; // 如果复制失败，跳过当前用户
            }
        }
        successfulUsers.push(user.name);
        const successfulUsersFilePath = join(__dirname, 'successfulUsers.json');

        // 检查文件是否存在，如果不存在则创建
        if (!existsSync(successfulUsersFilePath)) {
            writeFileSync(successfulUsersFilePath, JSON.stringify([], null, 2), 'utf8');
        }

        // 将成功用户列表写入文件
        try {
            writeFileSync(successfulUsersFilePath, JSON.stringify(successfulUsers, null, 2), 'utf8');
            console.log("Successfully updated successfulUsers.json");
        } catch (error) {
            console.error("Error writing successful users file:", error);
        }
    } catch (error) {
        const errorLogFilePath = join(__dirname, 'error.log');

        // 检查错误日志文件是否存在，如果不存在则创建
        if (!existsSync(errorLogFilePath)) {
            writeFileSync(errorLogFilePath, '', 'utf8');
        }

        // 将错误信息写入日志文件
        try {
            const errorData = `Error processing user: ${user.name}\nParameters: ${JSON.stringify(user)}\nError: ${error.message}\n\n`;
            writeFileSync(errorLogFilePath, errorData, { flag: 'a' }); // 追加写入
            console.error(`Logged error for ${user.name} to error.log`);
        } catch (logError) {
            console.error("Error writing to error log file:", logError);
        }
    }
    
}
