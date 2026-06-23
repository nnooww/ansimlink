let message = "";

/*
  안심링크 엄격 판정 방식

  점수화 방식 X
  위험 조건에 하나라도 걸리면 "위험"
  진짜 신뢰할 수 있는 공식 도메인일 때만 "안전"

  이유:
  https가 붙어 있어도 피싱, 유사 도메인, 아이피로거일 수 있기 때문.
*/

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

const urgentWords = [
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

function checkLink() {
    const inputUrl = document.getElementById("url").value.trim();

    if (inputUrl === "") {
        showResult(
            "위험",
            ["URL이 입력되지 않았습니다."],
            "검사할 URL을 입력해주세요."
        );
        return;
    }

    const result = analyzeUrlStrict(inputUrl);
    showResult(result.level, result.reasons, result.guide);
}

function analyzeUrlStrict(inputUrl) {
    let urlText = inputUrl;

    if (!urlText.startsWith("http://") && !urlText.startsWith("https://")) {
        urlText = "https://" + urlText;
    }

    let url;

    try {
        url = new URL(urlText);
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

    // 1. http 주소 차단
    if (url.protocol === "http:") {
        reasons.push("https가 아닌 http 주소입니다. 보안 연결이 약할 수 있습니다.");
    }

    // 2. 숫자 IP 주소 차단
    // 예: http://123.45.67.89
    if (isIpAddress(host)) {
        reasons.push("도메인 이름이 아니라 숫자로 된 IP 주소를 사용하고 있습니다.");
    }

    // 3. 아이피로거 의심 도메인 차단
    if (isDomainInList(host, ipLoggerDomains)) {
        reasons.push("아이피로거 또는 접속자 추적에 자주 사용되는 도메인입니다.");
    }

    // 4. 짧은 링크 차단
    if (isDomainInList(host, shortLinkDomains)) {
        reasons.push("짧은 주소 서비스가 사용되어 실제 이동할 사이트를 확인하기 어렵습니다.");
    }

    // 5. @ 포함 URL 차단
    // 예: https://google.com@evil.com
    if (url.username !== "" || url.password !== "" || inputUrl.includes("@")) {
        reasons.push("URL에 @ 또는 사용자 정보 형식이 포함되어 실제 접속 도메인을 속일 수 있습니다.");
    }

    // 6. 비슷한 문자로 위장한 도메인 차단
    if (host.includes("xn--")) {
        reasons.push("비슷한 글자로 위장한 국제화 도메인일 가능성이 있습니다.");
    }

    const trusted = isDomainInList(host, trustedDomains);

    // 7. 유명 사이트 유사 도메인 차단
    // 예: goudle.com, gooogle.com
    const typoBrand = findSimilarBrand(domainParts.mainName);

    if (!trusted && typoBrand !== null) {
        reasons.push(`${typoBrand} 공식 사이트와 비슷해 보이는 유사 도메인입니다.`);
    }

    // 8. 공식 도메인이 아닌데 유명 사이트 이름이 포함된 경우
    // 예: naver-login-event.com
    const containsBrand = brandNames.find(brand => host.includes(brand));

    if (!trusted && containsBrand) {
        reasons.push(`공식 도메인이 아닌데 ${containsBrand} 이름이 포함되어 있습니다.`);
    }

    // 9. 공식 도메인이 아닌데 로그인/인증/이벤트 단어 포함
    const foundWords = urgentWords.filter(word => fullUrl.includes(word));

    if (!trusted && foundWords.length > 0) {
        reasons.push("신뢰된 공식 도메인이 아닌데 로그인, 인증, 이벤트, 결제 같은 민감한 단어가 포함되어 있습니다.");
    }

    // 10. 무작위 문자열처럼 보이는 도메인 차단
    // 예: asdad.com, x7qz91.com
    if (!trusted && looksRandomDomain(domainParts.mainName)) {
        reasons.push("도메인 이름이 무작위 문자열처럼 보여 신뢰하기 어렵습니다.");
    }

    // 11. URL이 너무 긴 경우
    if (fullUrl.length >= 90) {
        reasons.push("URL이 지나치게 길어 실제 목적지를 파악하기 어렵습니다.");
    }

    // 12. 숫자가 너무 많은 경우
    if (countDigits(fullUrl) >= 12) {
        reasons.push("URL에 숫자가 과도하게 많이 포함되어 있습니다.");
    }

    // 13. 특수문자가 너무 많은 경우
    if (countSpecialChars(pathAndQuery) >= 8) {
        reasons.push("URL 경로에 특수문자가 많이 포함되어 있습니다.");
    }

    // 14. 엄격 모드
    // 신뢰 도메인 목록에 없는 처음 보는 도메인은 안전하다고 단정하지 않음
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
            "http, IP 주소, 짧은 링크, 유사 도메인, 아이피로거 패턴이 발견되지 않았습니다."
        ],
        guide: "현재 기준으로 안전한 링크로 판단됩니다. 그래도 개인정보 입력 전에는 주소를 한 번 더 확인하세요."
    };
}

function danger(reasons) {
    return {
        level: "위험",
        reasons: reasons,
        guide: "위험한 링크일 수 있습니다. 바로 누르지 말고 공식 사이트나 공식 앱으로 직접 접속하세요."
    };
}

function isDomainInList(host, list) {
    return list.some(domain => host === domain || host.endsWith("." + domain));
}

function isIpAddress(host) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
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
        mainName,
        tld
    };
}

function findSimilarBrand(domainName) {
    for (const brand of brandNames) {
        if (domainName === brand) {
            continue;
        }

        const distance = levenshtein(domainName, brand);

        // google -> goudle, gooogle 같은 한두 글자 차이 잡기
        if (brand.length >= 5 && distance <= 2) {
            return brand;
        }
    }

    return null;
}

function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () =>
        Array(b.length + 1).fill(0)
    );

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

    return randomLikePatterns.some(pattern => pattern.test(name));
}

function countDigits(text) {
    const result = text.match(/[0-9]/g);
    return result ? result.length : 0;
}

function countSpecialChars(text) {
    const result = text.match(/[!@#$%^&*()_=+{}\[\]|;:'",<>?`~]/g);
    return result ? result.length : 0;
}

function showResult(level, reasons, guide) {
    const resultBox = document.getElementById("result");
    const className = level === "위험" ? "danger" : "safe";

    message = `검사 결과는 ${level}입니다. ${guide} 판단 이유는 ${reasons.join(" ")}입니다.`;

    resultBox.className = className;
    resultBox.innerHTML = `
        <h2>${level === "위험" ? "🚨 위험" : "✅ 안전"}</h2>
        <p>${escapeHtml(guide)}</p>
        <p class="reason-title">판단 이유</p>
        <ul>
            ${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}
        </ul>
    `;
}

function speak() {
    if (message === "") {
        message = "먼저 링크를 분석해주세요.";
    }

    if (!("speechSynthesis" in window)) {
        alert("이 브라우저에서는 음성 안내 기능을 사용할 수 없습니다.");
        return;
    }

    speechSynthesis.cancel();

    const tts = new SpeechSynthesisUtterance(message);
    tts.lang = "ko-KR";
    tts.rate = 0.9;

    speechSynthesis.speak(tts);
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
