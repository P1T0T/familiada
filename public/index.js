const socket = io();
let manualAudio = null;

let gameState;
let armedSum = null;
let currentSum = 0;

const questionEl = document.getElementById("question");
const answersDiv = document.getElementById("answers");
const sumEl = document.getElementById("sum");
const audioBar =
    document.getElementById("audioBar");

const audioTime =
    document.getElementById("audioTime");

let gameSeconds = 0;

let gameTimerInterval = null;

// START GRY
document.getElementById("btnStartGame").onclick = () => {

    // START TIMERA
    clearInterval(gameTimerInterval);

    gameSeconds = 0;

    updateGameTimer();

    gameTimerInterval = setInterval(() => {

        gameSeconds++;

        updateGameTimer();

    }, 1000);

    // START GRY
    socket.emit("startGame");
};

// UPDATE OD SERWERA
socket.on("update", ({ gameState: gs, teamNames }) => {

    gameState = gs;
    gameState.teamNames = teamNames;
    gameState.usedQuestions =
    gs.usedQuestions || [];

    const showBtn =
        document.getElementById(
            "showQuestionBtn"
        );

    if (showBtn) {

        if (
            gameState.questionVisible
        ) {

            showBtn.style.display =
                "none";

        } else {

            showBtn.style.display =
                "inline-block";
        }
    }

    // Pytanie
    questionEl.textContent = gs.question || "WITAMY W FAMILIADZIE";

    // Odpowiedzi
    renderAnswers();

    // Suma
    updateSum();

    document.getElementById(
        "questionCounter"
    ).textContent =
        "PYTANIE #"
        + (gs.questionNumber || 0);
    
    // NAZWY PRZYCISKÓW PUNKTÓW
    document.getElementById(
        "leftAddBtn"
    ).textContent =
        teamNames.left;

    document.getElementById(
        "rightAddBtn"
    ).textContent =
        teamNames.right;

    // NAZWY PRZY BŁĘDACH
    document.getElementById(
        "leftXTitle"
    ).textContent =
        teamNames.left;

    document.getElementById(
        "rightXTitle"
    ).textContent =
        teamNames.right;
    
    // Punkty drużyn
    document.getElementById("leftPoints").textContent =
        gs.teamPointsLeft;

    document.getElementById("rightPoints").textContent =
        gs.teamPointsRight;

    // RESET INPUTÓW DRUŻYN PO WYCZYŚĆ
    const leftWrapper = document.getElementById("leftTeam");
    const rightWrapper = document.getElementById("rightTeam");

    // LEWA DRUŻYNA
    if (teamNames.left === "Drużyna 1") {

        leftWrapper.innerHTML = `
            <input id="leftInput" placeholder="Drużyna 1">
            <button onclick="confirmTeam('left')">✔</button>
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

    // PRAWA DRUŻYNA
    if (teamNames.right === "Drużyna 2") {

        rightWrapper.innerHTML = `
            <input id="rightInput" placeholder="Drużyna 2">
            <button onclick="confirmTeam('right')">✔</button>
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
});

// ODPOWIEDZI W CENTRUM
// zawsze widoczne
function renderAnswers() {

    answersDiv.innerHTML = "";

    const answers = gameState.answers || [];

    for (let i = 0; i < 5; i++) {

        const a = answers[i] || {
            text: "",
            points: 0,
            revealed: false
        };

        const div = document.createElement("div");

        // kolor wg odsłonięcia
        div.className =
            "answer " + (a.revealed ? "revealed" : "hidden");

        div.textContent =
            `${i + 1}. ${a.text} (${a.points})`;

        // klik = odsłoń na display
        div.onclick = () => socket.emit("revealAnswer", i);

        answersDiv.appendChild(div);
    }
}

// SUMA PUNKTÓW
function updateSum() {

    currentSum = gameState.answers
        ? gameState.answers.reduce(
            (s, a) => a.revealed ? s + a.points : s,
            0
        )
        : 0;

    sumEl.textContent = "SUMA: " + currentSum;
}

// UZBRAJANIE SUMY
sumEl.onclick = () => {

    armedSum = currentSum;

    sumEl.classList.add("active");
};

// DODAWANIE PUNKTÓW
document.getElementById("leftPoints").onclick =
    () => addSum("left");

document.getElementById("rightPoints").onclick =
    () => addSum("right");

function addSum(side) {

    if (!currentSum) return;

    socket.emit("addPoints", {
        side,
        points: currentSum
    });
}

// NOWE PYTANIE
function nextQuestion() {
    socket.emit("newQuestion");
}

// X-Y
function toggleX(key) {
    socket.emit("toggleX", key);
}

// RESET GRY
function resetGame() {

    openStatusModal();

    // zatrzymaj timer
    clearInterval(gameTimerInterval);

    // zapisz statystyki
    const stats = JSON.parse(
        localStorage.getItem("familiadaStats")
    ) || [];

    stats.push({

        date:
            new Date().toLocaleString(),

        leftTeam:
            gameState.teamNames?.left || "Drużyna 1",

        rightTeam:
            gameState.teamNames?.right || "Drużyna 2",

        leftPoints:
            gameState.teamPointsLeft,

        rightPoints:
            gameState.teamPointsRight,

        leftErrors:
            gameState.activeX.filter(
                x => x.includes("left")
            ).length,

        rightErrors:
            gameState.activeX.filter(
                x => x.includes("right")
            ).length,

        duration:
            document.getElementById("gameTimer").textContent

    });

    localStorage.setItem(
        "familiadaStats",
        JSON.stringify(stats)
    );

    socket.emit("resetGame");
}

// ZATWIERDZANIE DRUŻYNY
function confirmTeam(side) {

    const wrapper =
        document.getElementById(side + "Team");

    const input =
        wrapper.querySelector("input");

    const name = input.value;

    socket.emit("updateTeamName", {
        side,
        name
    });

    wrapper.innerHTML = `
        <span
            class="confirmed"
            ondblclick="editTeam('${side}')"
        >
            ${name}
        </span>
    `;
}

// EDYCJA DRUŻYNY
function editTeam(side) {

    const wrapper =
        document.getElementById(side + "Team");

    wrapper.innerHTML = `
        <input id="${side}Input">
        <button onclick="confirmTeam('${side}')">
            ✔
        </button>
    `;
}

// RĘCZNE PLAY AUDIO
function playManualSound() {

    const selected =
        document.getElementById("soundSelect").value;

    // zatrzymaj poprzedni
    if (manualAudio) {

        manualAudio.pause();
        manualAudio.currentTime = 0;
    }

    manualAudio = new Audio(selected);

    manualAudio.play();

    // update progress
    manualAudio.ontimeupdate = () => {

        const current =
            manualAudio.currentTime;

        const duration =
            manualAudio.duration || 0;

        // progress bar
        audioBar.value =
            duration
                ? (current / duration) * 100
                : 0;

        // format czasu
        audioTime.textContent =
            formatTime(current)
            + " / "
            + formatTime(duration);
    };

    // reset po końcu
    manualAudio.onended = () => {

        audioBar.value = 0;

        audioTime.textContent =
            "00:00 / 00:00";
    };
}

// STOP AUDIO
function stopManualSound() {

    if (!manualAudio) return;

    manualAudio.pause();

    manualAudio.currentTime = 0;
}

function clearRoundPoints() {

    const confirmClear = confirm(
        "Czy jesteś pewny wyczyszczenia punktów?\n\n" +
        "Pytanie i odpowiedzi zostaną wyświetlone.\n" +
        "Punkty drużyn NIE zostaną wyzerowane.\n" +
        "Wyzerują się tylko punkty z AKTUALNEJ rundy."
    );

    if (!confirmClear) return;

    socket.emit("clearRoundPoints");
}

function formatTime(seconds) {

    const mins =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return (
        String(mins).padStart(2, "0")
        + ":"
        + String(secs).padStart(2, "0")
    );
}

function updateGameTimer() {

    const mins =
        Math.floor(gameSeconds / 60);

    const secs =
        gameSeconds % 60;

    document.getElementById("gameTimerText").textContent =
        "CZAS GRY: "
        + String(mins).padStart(2, "0")
        + ":"
        + String(secs).padStart(2, "0");
}

function resumeGameTimer() {

    if (gameTimerInterval) return;

    gameTimerInterval = setInterval(() => {

        gameSeconds++;

        updateGameTimer();

    }, 1000);
}

function pauseGameTimer() {

    clearInterval(gameTimerInterval);

    gameTimerInterval = null;
}

function resetGameTimer() {

    clearInterval(gameTimerInterval);

    gameTimerInterval = null;

    gameSeconds = 0;

    updateGameTimer();
}

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
        .replace(/ż/g, "z")
        .replace(/Ą/g, "A")
        .replace(/Ć/g, "C")
        .replace(/Ę/g, "E")
        .replace(/Ł/g, "L")
        .replace(/Ń/g, "N")
        .replace(/Ó/g, "O")
        .replace(/Ś/g, "S")
        .replace(/Ź/g, "Z")
        .replace(/Ż/g, "Z");
}

async function generatePDF(data) {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();
    doc.setFont("helvetica");

    let y = 20;

    // Tytuł
    doc.setFontSize(20);

    doc.text(
        fixPolish("STATYSTYKA ROZGRYWKI FAMILIADY"),
        20,
        y
    );

    y += 15;

    // Data
    doc.setFontSize(12);

    doc.text(
        fixPolish("Data wygenerowania: ")
        + new Date().toLocaleString(),
        20,
        y
    );

    y += 15;

    // Czas gry
    const gameTime =
        document.getElementById(
            "gameTimerText"
        ).textContent;

    doc.text(
        gameTime,
        20,
        y
    );

    y += 15;

    // Wyniki
    doc.setFontSize(16);

    doc.text("WYNIKI:", 20, y);

    y += 10;

    doc.setFontSize(12);

    doc.text(
        fixPolish(
            `${data.leftTeam}: ${data.leftPoints} pkt (błędów w sumie: ${data.leftErrors})`
        ),
        25,
        y
    );

    y += 8;

    doc.text(
        fixPolish(
            `${data.rightTeam}: ${data.rightPoints} pkt (błędów w sumie: ${data.rightErrors})`
        ),
        25,
        y
    );

    y += 18;

    // Pytania
    doc.setFontSize(16);

    doc.text(
        fixPolish("WYKORZYSTANE PYTANIA:"),
        20,
        y
    );

    y += 12;

    doc.setFontSize(12);

    data.usedQuestions.forEach((q, i) => {

        doc.text(
            fixPolish(
                q.status === "ANULOWANE"
                    ? `${i + 1}. ${q.question} [ANULOWANE]`
                    : `${i + 1}. ${q.question}`

                + (

                    q.status === "ANULOWANE"

                    ? " [ANULOWANE]"

                    : ""
                )
            ),
            25,
            y
        );

        y += 8;

        // nowa strona
        if (y > 260) {

            doc.addPage();

            y = 20;
        }
    });

    y += 15;

    // Notka
    doc.setFontSize(10);

    const note = fixPolish(`
    Statystyka wygenerowana przez autorski system Samorządu Uczniowskiego.

    System jest własnością Samorządu Uczniowskiego
    i nie należy go wykorzystywać bez zgody autora.

    Niniejszym stwierdza się zgodność danych zawartych w statystyce
    z przebiegiem rozgrywki oraz oficjalnymi wynikami uzyskanymi
    podczas jej trwania.
    `);

    const split =
        doc.splitTextToSize(note, 170);

    doc.text(split, 20, y);

    // zapis
    doc.save(
        "statystyka_familiady.pdf"
    );

    socket.emit("finalReset");
}

function showQuestion() {

    socket.emit("showQuestion");
}

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
                document.createElement("div");

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
                        ${q.status === "ZATWIERDZONE" ? "selected" : ""}
                    >
                        ZATWIERDZONE
                    </option>

                    <option
                        value="ANULOWANE"
                        ${q.status === "ANULOWANE" ? "selected" : ""}
                    >
                        ANULOWANE
                    </option>
                </select>
            `;

            container.appendChild(row);
        }
    );

    modal.style.display =
        "flex";
}

function confirmGeneratePDF() {

    document.getElementById(
        "statusModal"
    ).style.display = "none";

    clearInterval(
        gameTimerInterval
    );

    generatePDF({

        leftTeam:
            gameState.teamNames.left,

        rightTeam:
            gameState.teamNames.right,

        leftPoints:
            gameState.teamPointsLeft,

        rightPoints:
            gameState.teamPointsRight,

        leftErrors:
            gameState.activeX.filter(
                x => x.includes("left")
            ).length,

        rightErrors:
            gameState.activeX.filter(
                x => x.includes("right")
            ).length,

        usedQuestions:
            gameState.usedQuestions
    });

    socket.emit("resetGame");
}

function cancelQuestion() {

    const confirmCancel = confirm(
        "Czy na pewno anulować to pytanie?\n\n" +
        "Pytanie otrzyma status ANULOWANE\n" +
        "i nastąpi przejście do kolejnego pytania."
    );

    if (!confirmCancel) return;

    // ostatnie pytanie
    const lastIndex =
        gameState.usedQuestions.length - 1;

    // ustaw status
    socket.emit(
        "updateQuestionStatus",
        {
            index: lastIndex,
            status: "ANULOWANE"
        }
    );

    // nowe pytanie
    socket.emit("newQuestion");
}