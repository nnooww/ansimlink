let lastMessage = "";
let detectedLinks = [];

const STORAGE_KEY = "ansimlink_history";

const trustedDomains = [
    "naver.com",
    "kakao.com",
    "daum.net",
    "google.com",
    "youtube.com",
    "gov.kr",
    "korea.kr",
    "coupang.com",
    "gmarket.co.kr",
    "11st.co.kr",
    "github.com",
    "github.io",
    "kb.com",
    "kbstar.com",
    "shinhan.com",
    "wooribank.com",
    "hanafn.com",
    "nhbank.com"
];

const brandNames = [
    "naver",
    "kakao",
    "daum",
    "google",
    "youtube",
    "coupang",
    "gmarket",
    "github",
    "kbstar",
    "shinhan",
    "woori",
    "hana",
    "nhbank",
    "gov"
];

const shortLinkDomains = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "url.kr",
    "me2.do",
    "han.gl",
    "shorturl.at",
    "is.gd",
    "cutt.ly"
];

const ipLoggerDomains = [
    "grabify.link",
    "iplogger.org",
    "iplogger.com",
    "2no.co",
    "yip.su",
    "blasze.com",
    "ipgraber.ru",
    "iplogger.ru"
];

const dangerousWords = [
    "login",
    "verify",
    "account",
    "password",
    "security",
    "event",
    "reward",
    "gift",
    "coupon",
    "free",
    "pay",
    "signin",
    "로그인",
    "인증",
    "계정",
    "비밀번호",
    "보안",
    "이벤트",
    "쿠폰",
    "당첨",
    "무료",
    "결제"
];

function allowPermission() {
    showScreen("mainScreen");

    speak(
        "권한이 허용되었습니다. 검사할 문자나 링크를 붙여넣고 링크 탐지 및 분석하기 버튼을 눌러주세요."
    );
}

function denyPermission() {
    speak(
        "권한이 허용되지 않았습니다. 링크 분석 기능을 사용할 수 없습니다."
    );
}

function showScreen(screenId) {
    const screens = document.querySelectorAll(".screen");

    screens.forEach(function (screen) {
        screen.classList.remove("active");
    });

    document.getElementById(screenId).classList.add("active");
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById("inputText").value = text;

        speak("클립보드 내용을 붙여넣었습니다. 링크 탐지 및 분석하기 버튼을 눌러주세요.");
    } catch (error) {
        speak("클립보드 권한을 사용할 수 없습니다. 직접 붙여넣어 주세요.");
        alert("클립보드 권한을 사용할 수 없습니다. 직접 붙여넣어 주세요.");
    }
}

function insertSample() {
    const sampleText =
        "보안 인증이 필요합니다. https://goudle.com/login/verify?account=123456789012 로 접속하세요.\n\n" +
        "정부24 공식 사이트는 https://www.gov.kr 입니다.\n\n" +
        "무료 이벤트 당첨 확인: https://asdad.com/event/free-gift\n\n" +
        "사진 확인 링크: https://grabify.link/test\n\n" +
        "짧은 주소: https://bit.ly/abc123";

    document.getElementById("inputText").value = sampleText;

    speak("테스트 예시를 입력했습니다.");
}

function detectAndAnalyzeLinks() {
    const text = document.getElementById("inputText").value.trim();
    const resultArea = document.getElementById("resultArea");

    resultArea.innerHTML = "";

    if (text === "") {
        detectedLinks = [];
        updateStatus();

        resultArea.innerHTML = `
            <div class="empty-box">
                검사할 내용을 입력해주세요.
            </div>
        `;

        speak("검사할 내용을 입력해주세요.");
        return;
    }

    detectedLinks = extractLinks(text);
    updateStatus();

    if (detectedLinks.length === 0) {
        resultArea.innerHTML = `
            <div class="empty-box">
                탐지된 링크가 없습니다.
            </div>
        `;

        speak("탐지된 링크가 없습니다.");
        return;
    }

    let speechText = "링크 " + detectedLinks.length + "개를 감지했습니다. ";

    detectedLinks.forEach(function (url) {
        const result = analyzeUrl(url);
        saveHistory(url, result);

        const className = result.level === "위험" ? "danger" : "safe";
        const icon = result.level === "위험" ? "🚨" : "✅";
        const guide =
            result.level === "위험"
                ? "이 링크를 누르지 말고 공식 사이트나 공식 앱으로 직접 접속하세요."
                : "현재 기준으로 위험 요소는 발견되지 않았지만 개인정보 입력 전에는 주소를 다시 확인하세요.";

        speechText +=
            "검사 결과는 " + result.level + "입니다. " +
            "이유는 " + result.reasons.join(" ") + "입니다. ";

        resultArea.innerHTML += `
            <article class="result-card ${className}">
                <h2>${icon} ${result.level}</h2>

                <p class="url-text">
                    <strong>탐지된 URL</strong><br>
                    ${escapeHtml(url)}
                </p>

                <p class="reason-title">판단 이유</p>
                <ul>
                    ${result.reasons.map(function (reason) {
                        return "<li>" + escapeHtml(reason) + "</li>";
                    }).join("")}
                </ul>

                <p class="reason-title">대처 방법</p>
                <p>${guide}</p>
            </article>
        `;
    });

    speak(speechText);
}

function updateStatus() {
    document.getElementById("statusBox").innerText =
        "발견된 링크 수: " + detectedLinks.length + "개";
}

function extractLinks(text) {
    const urlPattern = /((https?:\/\/)?(www\.)?[a-zA-Z0-9가-힣.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/g;
    const matches = text.match(urlPattern) || [];

    const cleaned = matches.map(function (url) {
        return url
            .trim()
            .replace(/[),.]+$/g, "");
    });

    const normalized = cleaned.map(function (url) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }

        return "https://" + url;
    });

    return Array.from(new Set(normalized));
}

function analyzeUrl(inputUrl) {
    let url;

    try {
        url = new URL(inputUrl);
    } catch (error) {
        return danger([
            "URL 형식이 올바르지 않습니다."
        ]);
    }

    const fullUrl = url.href.toLowerCase();
    const host = url.hostname.toLowerCase();
    const pathAndQuery = (url.pathname + url.search).toLowerCase();
    const domainParts = getDomainParts(host);

    let reasons = [];

    if (url.protocol === "http:") {
        reasons.push("https가 아닌 http 주소입니다. 보안 연결이 약할 수 있습니다.");
    }

    if (isIpAddress(host)) {
        reasons.push("도메인 이름이 아니라 숫자 IP 주소를 사용하고 있습니다.");
    }

    if (isDomainInList(host, ipLoggerDomains)) {
        reasons.push("아이피로거 또는 접속자 추적에 자주 사용되는 도메인입니다.");
    }

    if (isDomainInList(host, shortLinkDomains)) {
        reasons.push("짧은 주소 서비스라서 실제 이동할 사이트를 확인하기 어렵습니다.");
    }

    if (url.username !== "" || url.password !== "" || inputUrl.includes("@")) {
        reasons.push("URL에 @ 또는 사용자 정보 형식이 포함되어 실제 접속 도메인을 속일 수 있습니다.");
    }

    if (host.includes("xn--")) {
        reasons.push("비슷한 문자로 위장한 국제화 도메인일 가능성이 있습니다.");
    }

    const trusted = isDomainInList(host, trustedDomains);

    const similarBrand = findSimilarBrand(domainParts.mainName);

    if (!trusted && similarBrand !== null) {
        reasons.push(similarBrand + " 공식 사이트와 비슷해 보이는 유사 도메인입니다.");
    }

    const includedBrand = brandNames.find(function (brand) {
        return host.includes(brand);
    });

    if (!trusted && includedBrand) {
        reasons.push("공식 도메인이 아닌데 " + includedBrand + " 이름이 포함되어 있습니다.");
    }

    const foundDangerousWords = dangerousWords.filter(function (word) {
        return fullUrl.includes(word);
    });

    if (!trusted && foundDangerousWords.length > 0) {
        reasons.push("공식 도메인이 아닌데 로그인, 인증, 이벤트, 결제 같은 민감한 단어가 포함되어 있습니다.");
    }

    if (!trusted && looksRandomDomain(domainParts.mainName)) {
        reasons.push("도메인 이름이 무작위 문자열처럼 보여 신뢰하기 어렵습니다.");
    }

    if (fullUrl.length >= 90) {
        reasons.push("URL이 지나치게 길어 실제 목적지를 파악하기 어렵습니다.");
    }

    if (countDigits(fullUrl) >= 12) {
        reasons.push("URL에 숫자가 과도하게 많이 포함되어 있습니다.");
    }

    if (countSpecialChars(pathAndQuery) >= 8) {
        reasons.push("URL 경로에 특수문자가 많이 포함되어 있습니다.");
    }

    if (!trusted && reasons.length === 0) {
        reasons.push("공식 또는 신뢰 도메인 목록에 없는 처음 보는 도메인입니다.");
    }

    if (reasons.length > 0) {
        return danger(reasons);
    }

    return {
        level: "안전",
        reasons: [
            "신뢰 도메인 목록에 있는 주소입니다.",
            "위험 패턴이 발견되지 않았습니다."
        ]
    };
}

function danger(reasons) {
    return {
        level: "위험",
        reasons: reasons
    };
}

function saveHistory(url, result) {
    const history = loadHistory();

    const data = {
        url: url,
        level: result.level,
        reason: result.reasons.join(" / "),
        date: new Date().toLocaleString("ko-KR")
    };

    history.unshift(data);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(0, 30))
    );
}

function loadHistory() {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
        return [];
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function showHistory() {
    const history = loadHistory();
    const area = document.getElementById("historyArea");

    area.innerHTML = "";

    if (history.length === 0) {
        area.innerHTML = `
            <div class="history-item">
                저장된 검사 기록이 없습니다.
            </div>
        `;
    } else {
        history.forEach(function (item) {
            area.innerHTML += `
                <div class="history-item">
                    <strong>${escapeHtml(item.level)}</strong><br>
                    ${escapeHtml(item.url)}<br>
                    <small>${escapeHtml(item.date)}</small>
                    <p>${escapeHtml(item.reason)}</p>
                </div>
            `;
        });
    }

    showScreen("historyScreen");
}

function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    showHistory();
    speak("검사 기록을 삭제했습니다.");
}

function goMain() {
    showScreen("mainScreen");
}

function speak(text) {
    lastMessage = text;

    if (!("speechSynthesis" in window)) {
        return;
    }

    speechSynthesis.cancel();

    const tts = new SpeechSynthesisUtterance(text);
    tts.lang = "ko-KR";
    tts.rate = 0.9;

    speechSynthesis.speak(tts);
}

function speakLastMessage() {
    if (lastMessage === "") {
        speak("아직 안내할 내용이 없습니다.");
        return;
    }

    speak(lastMessage);
}

function isDomainInList(host, list) {
    return list.some(function (domain) {
        return host === domain || host.endsWith("." + domain);
    });
}

function isIpAddress(host) {
    const parts = host.split(".");

    if (parts.length !== 4) {
        return false;
    }

    return parts.every(function (part) {
        const number = Number(part);
        return part !== "" && number >= 0 && number <= 255;
    });
}

function getDomainParts(host) {
    const parts = host.split(".");

    if (parts.length < 2) {
        return {
            mainName: host,
            tld: ""
        };
    }

    let mainName = parts[parts.length - 2];
    let tld = parts[parts.length - 1];

    if (parts.length >= 3 && parts[parts.length - 2] === "co") {
        mainName = parts[parts.length - 3];
        tld = "co." + parts[parts.length - 1];
    }

    return {
        mainName: mainName,
        tld: tld
    };
}

function findSimilarBrand(domainName) {
    for (let i = 0; i < brandNames.length; i++) {
        const brand = brandNames[i];

        if (domainName === brand) {
            continue;
        }

        const distance = levenshtein(domainName, brand);

        if (brand.length >= 5 && distance <= 2) {
            return brand;
        }
    }

    return null;
}

function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, function () {
        return Array(b.length + 1).fill(0);
    });

    for (let i = 0; i <= a.length; i++) {
        dp[i][0] = i;
    }

    for (let j = 0; j <= b.length; j++) {
        dp[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[a.length][b.length];
}

function looksRandomDomain(name) {
    if (name.length <= 4) {
        return true;
    }

    const vowels = name.match(/[aeiou]/g) || [];
    const digits = name.match(/[0-9]/g) || [];
    const consonantGroups = name.match(/[bcdfghjklmnpqrstvwxyz]{4,}/g) || [];

    if (digits.length >= 3) {
        return true;
    }

    if (consonantGroups.length > 0) {
        return true;
    }

    if (vowels.length === 0 && name.length >= 5) {
        return true;
    }

    const randomLikePatterns = [
        /asd/i,
        /qwe/i,
        /zxc/i,
        /test/i,
        /temp/i
    ];

    return randomLikePatterns.some(function (pattern) {
        return pattern.test(name);
    });
}

function countDigits(text) {
    const result = text.match(/[0-9]/g);
    return result ? result.length : 0;
}

function countSpecialChars(text) {
    const result = text.match(/[!@#$%^&*()_=+{}\[\]|;:'",<>?`~]/g);
    return result ? result.length : 0;
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
