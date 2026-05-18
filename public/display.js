const socket = io();

const badSound =
    document.getElementById("badSound");

const goodSound =
    document.getElementById("goodSound");

const nextSound =
    document.getElementById("nextSound");

let previousX = 0;
let previousRevealed = 0;
let previousQuestion = "";

// ODBLOKOWANIE AUDIO
document.body.addEventListener("click", () => {

    badSound.play()
        .then(() => {
            badSound.pause();
            badSound.currentTime = 0;
        })
        .catch(() => {});

    goodSound.play()
        .then(() => {
            goodSound.pause();
            goodSound.currentTime = 0;
        })
        .catch(() => {});

}, { once: true });

socket.on("update", ({ gameState, teamNames }) => {
    // DŹWIĘK NOWEGO PYTANIA
    if (
        gameState.question &&
        previousQuestion &&
        gameState.question !== previousQuestion
    ) {

        nextSound.currentTime = 0;

        nextSound.play().catch(() => {});
    }

    previousQuestion = gameState.question;

    // DŹWIĘK BŁĘDU
    if (gameState.activeX.length > previousX) {

        badSound.currentTime = 0;

        badSound.play().catch(() => {});
    }

    previousX = gameState.activeX.length;

    // DŹWIĘK DOBREJ ODPOWIEDZI
    const revealedCount =
        gameState.answers.filter(a => a.revealed).length;

    if (revealedCount > previousRevealed) {

        goodSound.currentTime = 0;

        goodSound.play().catch(() => {});
    }

    previousRevealed = revealedCount;

    // ELEMENTY
    const question =
        document.getElementById("question");

    const answers =
        document.getElementById("answers");

    const sum =
        document.getElementById("sum");

    const frame =
        document.querySelector(".frame");

    const teams =
        document.querySelectorAll(".team");

    const errors =
        document.querySelectorAll(".errors");

    // =========================
    // EKRAN POWITALNY
    // =========================

    if (!gameState.question) {

        // UKRYJ UI GRY
        frame.style.display = "none";

        teams.forEach(t => {
            t.style.display = "none";
        });

        errors.forEach(e => {
            e.style.display = "none";
        });

        // STWÓRZ NAPIS
        if (!document.getElementById("welcomeScreen")) {

            const welcome =
                document.createElement("div");

            welcome.id = "welcomeScreen";

            welcome.className =
                "welcome-screen";

            welcome.innerHTML =
                "WITAMY W FAMILIADZIE";

            document.body.appendChild(welcome);
        }

        return;
    }

    // =========================
    // NORMALNA GRA
    // =========================

    // USUŃ WELCOME
    const oldWelcome =
        document.getElementById("welcomeScreen");

    if (oldWelcome)
        oldWelcome.remove();

    // POKAŻ UI
    frame.style.display = "block";

    teams.forEach(t => {
        t.style.display = "block";
    });

    errors.forEach(e => {
        e.style.display = "block";
    });

    // PYTANIE
    if (!gameState.started) {

        question.textContent =
            "WITAMY W FAMILIADZIE";

    } else if (gameState.questionVisible) {

        question.textContent =
            gameState.question;

    } else {

        question.textContent =
            "----------";
    }

    answers.innerHTML = "";

    let total = 0;

    gameState.answers.forEach((a, i) => {

        const row =
            document.createElement("div");

        row.className = "row";

        row.innerHTML = `
            <div class="${a.revealed ? 'revealed' : 'hidden'}">
                ${i + 1}. ${a.revealed ? a.text : ".............."}
            </div>

            <div class="${a.revealed ? 'revealed' : 'hidden'}">
                ${a.revealed ? a.points : ""}
            </div>
        `;

        if (a.revealed)
            total += a.points;

        answers.appendChild(row);
    });

    // SUMA
    sum.textContent =
        "SUMA " + total;

    // DRUŻYNY
    document.getElementById("teamLeftName").textContent =
        teamNames.left;

    document.getElementById("teamRightName").textContent =
        teamNames.right;

    document.getElementById("teamLeftPoints").textContent =
        gameState.teamPointsLeft;

    document.getElementById("teamRightPoints").textContent =
        gameState.teamPointsRight;

    // X-Y
    toggleX("left1", "x-left-1", gameState);
    toggleX("left2", "x-left-2", gameState);
    toggleX("left3", "x-left-3", gameState);

    toggleX("right1", "x-right-1", gameState);
    toggleX("right2", "x-right-2", gameState);
    toggleX("right3", "x-right-3", gameState);
});

function toggleX(key, id, gameState) {

    const el =
        document.getElementById(id);

    el.classList.toggle(
        "active",
        gameState.activeX.includes(key)
    );
}