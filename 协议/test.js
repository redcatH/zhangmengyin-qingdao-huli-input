async function sendCheckInRequest() {
    const url = "http://test.vssh.top/api/rest/nursing/kh01/checkIn";
    const options = {
        headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
            "content-type": "application/json;charset=UTF-8",
            cookie: "SESSION=MDNlNGFkZGUtZjRmNy00ZDgxLWIyZTktNjY1ZjBhNmY3ZTY3",
            Referer: "http://test.vssh.top/",
            "Referrer-Policy": "no-referrer-when-downgrade"
        },
        body: JSON.stringify({
            ckh002: "2025022117193395",
            aac002: "370223192805126726",
            aac003: "姜",
            aae030: 20250530,
            aae031: null,
            aae013: null,
            kh04AddDTOList: [
                { ckh048: "1000000269" },
                { ckh048: "1000000273" },
                { ckh048: "1000000260" },
                { ckh048: "1000000258" },
                { ckh048: "1000000270" },
                { ckh048: "1000000271" },
                { ckh048: "1000000272" },
                { ckh048: "1000000525" },
                { ckh048: "1000000520" },
                { ckh048: "1000000519" },
                { ckh048: "1000000971" },
                { ckh048: "1000000919" }
            ],
            ckh059: 1000000147,
            ckh079: "",
            ckh099: 1000341248,
            ckh500: 1000338012,
            ckh600: 1000343455,
            ckh200: "",
            ckh003: "01",
            ckh173: null,
            ckh101: "",
            ckh281: "0",
            ckf181: "06",
            ckh122: "",
            ckh280: "",
            kh27DTOList: []
        }),
        method: "POST"
    };

    try {
        const response = await fetch(url, options);
        const data = await response.text();
        return data; // 返回响应数据
    } catch (error) {
        console.error("Error occurred:", error.message || error.toString());
        return { error: error.message || error.toString() }; // 返回错误信息
    }
}

// 调用函数示例
sendCheckInRequest().then(result => {
    console.log("Result:", result);
});