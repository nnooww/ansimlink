let message = "";

function checkLink() {
    const url = document.getElementById("url").value;

    if (url.trim() === "") {
        document.getElementById("result").innerHTML =
            "URL을 입력해주세요.";
        return;
    }

    let score = 0;
    let reasons = [];

    if (url.includes("http://")) {
        score += 20;
        reasons.push("보안 연결(https)을 사용하지 않습니다.");
    }

    if (url.includes("bank")) {
        score += 30;
        reasons.push("bank 단어가 포함되어 있습니다.");
    }

    if (url.includes("login")) {
        score += 30;
        reasons.push("login 단어가 포함되어 있습니다.");
    }

    if (url.includes("verify")) {
        score += 30;
        reasons.push("verify 단어가 포함되어 있습니다.");
    }

    if (url.includes("event")) {
        score += 30;
        reasons.push("event 단어가 포함되어 있습니다.");
    }

    if (url.length >= 50) {
        score += 15;
        reasons.push("URL 길이가 너무 깁니다.");
    }

    let result = "";

    if (score >= 60) {
        result = "🚨 위험";
        message = "위험한 링크입니다. 클릭하지 않는 것을 권장합니다.";
    } else if (score >= 30) {
        result = "⚠️ 주의";
        message = "의심스러운 링크입니다. 주의가 필요합니다.";
    } else {
        result = "✅ 안전";
        message = "안전한 링크로 판단됩니다.";
    }

    document.getElementById("result").innerHTML =
        `
        <h2>${result}</h2>
        <p>${message}</p>
        <p>${reasons.join("<br>")}</p>
        `;
}

function speak() {
    if (message === "") return;

    const tts = new SpeechSynthesisUtterance(message);
    tts.lang = "ko-KR";
    speechSynthesis.speak(tts);
}
