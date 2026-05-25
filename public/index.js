const socket = io();
let manualAudio = null;

let gameState;
let currentSum = 0;

const questionEl =
    document.getElementById("question");

const answersDiv =
    document.getElementById("answers");

const sumEl =
    document.getElementById("sum");

const audioBar =
    document.getElementById("audioBar");

const audioTime =
    document.getElementById("audioTime");

let gameSeconds = 0;
let gameTimerInterval = null;

// START GRY
document.getElementById(
    "btnStartGame"
).onclick = () => {

    clearInterval(
        gameTimerInterval
    );

    gameSeconds = 0;

    updateGameTimer();

    gameTimerInterval =
        setInterval(() => {

            gameSeconds++;

            updateGameTimer();

        }, 1000);

    socket.emit("startGame");
};

// UPDATE
socket.on(
    "update",
    ({ gameState: gs, teamNames }) => {

        gameState = gs;

        gameState.teamNames =
            teamNames;

        gameState.usedQuestions =
            gs.usedQuestions || [];

        const showBtn =
            document.getElementById(
                "showQuestionBtn"
            );

        if (showBtn) {

            showBtn.style.display =
                gameState.questionVisible
                    ? "none"
                    : "inline-block";
        }

        questionEl.textContent =
            gs.question ||
            "WITAMY W FAMILIADZIE";

        renderAnswers();

        updateSum();

        document.getElementById(
            "questionCounter"
        ).textContent =
            "PYTANIE #"
            + (gs.questionNumber || 0);

        // przyciski punktów
        document.getElementById(
            "leftAddBtn"
        ).textContent =
            teamNames.left;

        document.getElementById(
            "rightAddBtn"
        ).textContent =
            teamNames.right;

        // nazwy przy błędach
        document.getElementById(
            "leftXTitle"
        ).textContent =
            teamNames.left;

        document.getElementById(
            "rightXTitle"
        ).textContent =
            teamNames.right;

        // punkty
        document.getElementById(
            "leftPoints"
        ).textContent =
            gs.teamPointsLeft;

        document.getElementById(
            "rightPoints"
        ).textContent =
            gs.teamPointsRight;

        renderTeams(teamNames);
    }
);

// RENDER DRUŻYN
function renderTeams(teamNames) {

    const leftWrapper =
        document.getElementById(
            "leftTeam"
        );

    const rightWrapper =
        document.getElementById(
            "rightTeam"
        );

    if (
        teamNames.left
        === "Drużyna 1"
    ) {

        leftWrapper.innerHTML = `
            <input
                id="leftInput"
                placeholder="Drużyna 1"
            >

            <button
                onclick="confirmTeam('left')"
            >
                ✔
            </button>
        `;

    } else {

        leftWrapper.innerHTML = `
            <span
                class="confirmed"
                ondblclick="editTeam('left')"
            >
                ${teamNames.left}
            </span>
        `;
    }

    if (
        teamNames.right
        === "Drużyna 2"
    ) {

        rightWrapper.innerHTML = `
            <input
                id="rightInput"
                placeholder="Drużyna 2"
            >

            <button
                onclick="confirmTeam('right')"
            >
                ✔
            </button>
        `;

    } else {

        rightWrapper.innerHTML = `
            <span
                class="confirmed"
                ondblclick="editTeam('right')"
            >
                ${teamNames.right}
            </span>
        `;
    }
}

// ODPOWIEDZI
function renderAnswers() {

    answersDiv.innerHTML = "";

    const answers =
        gameState.answers || [];

    for (let i = 0; i < 5; i++) {

        const a = answers[i] || {

            text: "",
            points: 0,
            revealed: false
        };

        const div =
            document.createElement("div");

        div.className =
            "answer "
            + (
                a.revealed
                    ? "revealed"
                    : "hidden"
            );

        div.textContent =
            `${i + 1}. ${a.text} (${a.points})`;

        div.onclick = () =>
            socket.emit(
                "revealAnswer",
                i
            );

        answersDiv.appendChild(div);
    }
}

// SUMA
function updateSum() {

    currentSum =
        gameState.answers
            ? gameState.answers.reduce(
                (s, a) =>
                    a.revealed
                        ? s + a.points
                        : s,
                0
            )
            : 0;

    sumEl.textContent =
        "SUMA: "
        + currentSum;
}

// DODAWANIE PUNKTÓW
document.getElementById(
    "leftPoints"
).onclick = () =>
    addSum("left");

document.getElementById(
    "rightPoints"
).onclick = () =>
    addSum("right");

function addSum(side) {

    if (!currentSum) return;

    socket.emit(
        "addPoints",
        {
            side,
            points: currentSum
        }
    );
}

// NOWE PYTANIE
function nextQuestion() {

    socket.emit(
        "newQuestion"
    );
}

// X
function toggleX(key) {

    socket.emit(
        "toggleX",
        key
    );
}

// ZAKOŃCZ GRĘ
function resetGame() {

    clearInterval(
        gameTimerInterval
    );

    openStatusModal();
}

// DRUŻYNY
function confirmTeam(side) {

    const wrapper =
        document.getElementById(
            side + "Team"
        );

    const input =
        wrapper.querySelector(
            "input"
        );

    const name =
        input.value;

    socket.emit(
        "updateTeamName",
        {
            side,
            name
        }
    );
}

function editTeam(side) {

    const wrapper =
        document.getElementById(
            side + "Team"
        );

    wrapper.innerHTML = `
        <input id="${side}Input">

        <button
            onclick="
                confirmTeam('${side}')
            "
        >
            ✔
        </button>
    `;
}

// AUDIO
function playManualSound() {

    const selected =
        document.getElementById(
            "soundSelect"
        ).value;

    if (manualAudio) {

        manualAudio.pause();

        manualAudio.currentTime = 0;
    }

    manualAudio =
        new Audio(selected);

    manualAudio.play();

    manualAudio.ontimeupdate =
        () => {

            const current =
                manualAudio.currentTime;

            const duration =
                manualAudio.duration || 0;

            audioBar.value =
                duration
                    ? (
                        current
                        / duration
                    ) * 100
                    : 0;

            audioTime.textContent =
                formatTime(current)
                + " / "
                + formatTime(duration);
        };

    manualAudio.onended =
        () => {

            audioBar.value = 0;

            audioTime.textContent =
                "00:00 / 00:00";
        };
}

function stopManualSound() {

    if (!manualAudio)
        return;

    manualAudio.pause();

    manualAudio.currentTime = 0;
}

// TIMER
function formatTime(seconds) {

    const mins =
        Math.floor(
            seconds / 60
        );

    const secs =
        Math.floor(
            seconds % 60
        );

    return (
        String(mins)
            .padStart(2, "0")
        + ":"
        + String(secs)
            .padStart(2, "0")
    );
}

function updateGameTimer() {

    const mins =
        Math.floor(
            gameSeconds / 60
        );

    const secs =
        gameSeconds % 60;

    document.getElementById(
        "gameTimerText"
    ).textContent =
        "CZAS GRY: "
        + String(mins)
            .padStart(2, "0")
        + ":"
        + String(secs)
            .padStart(2, "0");
}

function resumeGameTimer() {

    if (
        gameTimerInterval
    ) return;

    gameTimerInterval =
        setInterval(() => {

            gameSeconds++;

            updateGameTimer();

        }, 1000);
}

function pauseGameTimer() {

    clearInterval(
        gameTimerInterval
    );

    gameTimerInterval =
        null;
}

function resetGameTimer() {

    clearInterval(
        gameTimerInterval
    );

    gameTimerInterval =
        null;

    gameSeconds = 0;

    updateGameTimer();
}

// PDF
socket.on(
    "gameStats",
    data => {

        generatePDF(data);
    }
);

function fixPolish(text) {

    return text
        .replace(/ą/g, "a")
        .replace(/ć/g, "c")
        .replace(/ę/g, "e")
        .replace(/ł/g, "l")
        .replace(/ń/g, "n")
        .replace(/ó/g, "o")
        .replace(/ś/g, "s")
        .replace(/ź/g, "z")
        .replace(/ż/g, "z");
}

async function generatePDF(data) {

    const { jsPDF } =
        window.jspdf;

    const doc =
        new jsPDF();

    let y = 20;

    doc.setFontSize(20);

    doc.text(
        fixPolish(
            "STATYSTYKA ROZGRYWKI FAMILIADY"
        ),
        20,
        y
    );

    y += 20;

    doc.setFontSize(12);

    doc.text(
        fixPolish(
        `${data.leftTeam}: ${data.leftPoints} pkt (błędów w sumie: ${data.leftErrors})`
        ),
        20,
        y
    );

    y += 10;

    doc.text(
        fixPolish(
        `${data.rightTeam}: ${data.rightPoints} pkt (błędów w sumie: ${data.rightErrors})`
        ),
        20,
        y
    );

    y += 20;

    doc.setFontSize(16);

    doc.text(
        fixPolish("WYKORZYSTANE PYTANIA:"),
        20,
        y
    );

    y += 12;

    doc.setFontSize(12);

    data.usedQuestions.forEach((q, i) => {

        let line =
            `${i + 1}. ${q.question}`;

        if (
            q.status === "ANULOWANE"
        ) {

            line += " [ANULOWANE]";
        }

        doc.text(
            fixPolish(line),
            25,
            y
        );

        y += 8;

        if (y > 260) {

            doc.addPage();

            y = 20;
        }
    });

    y += 15;

    // NOTKA
    doc.setFontSize(10);

    const note = fixPolish(`

    Statystyka wygenerowana przez autorski system Samorządu Uczniowskiego.

    System jest własnością Samorządu Uczniowskiego
    i nie należy go wykorzystywać bez zgody autora.

    Niniejszym stwierdza się zgodność danych zawartych
    w statystyce z przebiegiem rozgrywki oraz oficjalnymi
    wynikami uzyskanymi podczas jej trwania.

    `);

    const split =
        doc.splitTextToSize(
            note,
            170
        );

    doc.text(
        split,
        20,
        y
    );

    // ZAPIS PDF
    doc.save(
        "statystyka_familiady.pdf"
    );

    // RESET PO PDF
    socket.emit(
        "finalReset"
    );
}

// POKAŻ PYTANIE
function showQuestion() {

    socket.emit(
        "showQuestion"
    );
}

// STATUS MODAL
function openStatusModal() {

    const modal =
        document.getElementById(
            "statusModal"
        );

    const container =
        document.getElementById(
            "statusQuestions"
        );

    container.innerHTML = "";

    gameState.usedQuestions.forEach(
        (q, i) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "statusRow";

            row.innerHTML = `

                <div>
                    ${i + 1}. ${q.question}
                </div>

                <select
                    onchange="
                        gameState.usedQuestions[${i}].status = this.value
                    "
                >

                    <option
                        value="ZATWIERDZONE"
                        ${q.status === "ZATWIERDZONE"
                            ? "selected"
                            : ""}
                    >
                        ZATWIERDZONE
                    </option>

                    <option
                        value="ANULOWANE"
                        ${q.status === "ANULOWANE"
                            ? "selected"
                            : ""}
                    >
                        ANULOWANE
                    </option>

                </select>
            `;

            container.appendChild(
                row
            );
        }
    );

    modal.style.display =
        "flex";
}

function confirmGeneratePDF() {

    document.getElementById(
        "statusModal"
    ).style.display = "none";

    socket.emit(
        "resetGame",
        {
            usedQuestions:
                gameState.usedQuestions
        }
    );
}

// ANULUJ PYTANIE
function cancelQuestion() {

    const confirmCancel =
        confirm(
            "Czy anulować pytanie?"
        );

    if (!confirmCancel)
        return;

    const lastIndex =
        gameState.usedQuestions.length - 1;

    gameState.usedQuestions[
        lastIndex
    ].status =
        "ANULOWANE";

    socket.emit(
        "updateQuestionStatus",
        {
            index: lastIndex,
            status: "ANULOWANE"
        }
    );

    socket.emit(
        "newQuestion"
    );
}