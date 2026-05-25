const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// PLAYERS
const playersData = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "players.json"),
        "utf8"
    )
);

// QUESTIONS
const questions = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "questions.json"),
        "utf8"
    )
);

// BŁĘDY
let gameErrors = {
    left: 0,
    right: 0
};

// UŻYTE PYTANIA
let usedQuestions = [];

// HISTORIA PYTAŃ
let usedQuestionsHistory = [];

// NUMER PYTANIA
let currentQuestionNumber = 0;

// GAME STATE
let gameState = {
    question: "",
    answers: [],
    teamPointsLeft: 0,
    teamPointsRight: 0,
    activeX: [],
    started: false,
    questionVisible: false,
    questionNumber: 0
};

// NAZWY DRUŻYN
let teamNames = {
    left: "Drużyna 1",
    right: "Drużyna 2"
};

// LOSOWANIE PYTANIA
function loadRandomQuestion() {

    const keys = Object.keys(questions);

    // tylko niewykorzystane
    const availableKeys =
        keys.filter(
            k => !usedQuestions.includes(k)
        );

    // brak pytań
    if (availableKeys.length === 0) {

        gameState.question =
            "BRAK DOSTĘPNYCH PYTAŃ";

        gameState.answers = [];

        gameState.activeX = [];

        return;
    }

    // LOSOWANIE
    let randomKey;

    for (let i = 0; i < 3; i++) {

        randomKey =
            availableKeys[
                Math.floor(
                    Math.random()
                    * availableKeys.length
                )
            ];
    }

    // POBRANIE PYTANIA
    const q = questions[randomKey];

    // DODAJ DO UŻYTYCH
    usedQuestions.push(randomKey);

    // NUMER PYTANIA
    currentQuestionNumber++;

    // DODAJ DO HISTORII
    usedQuestionsHistory.push({

        number:
            currentQuestionNumber,

        key:
            randomKey,

        question:
            q.text,

        status:
            "ZATWIERDZONE"
    });

    // GAMESTATE
    gameState.question =
        q.text;

    gameState.answers =
        q.answers.map(a => ({

            text:
                a.text,

            points:
                a.points,

            revealed:
                false
        }));

    gameState.activeX = [];

    gameState.started = true;

    gameState.questionVisible = false;

    gameState.questionNumber =
        currentQuestionNumber;
}

// SOCKET
io.on("connection", socket => {

    // WYŚLIJ UPDATE
    function sendUpdate() {

        io.emit("update", {

            gameState: {

                ...gameState,

                usedQuestions:
                    usedQuestionsHistory
            },

            teamNames
        });
    }

    // PODGLĄD DRUŻYN
    socket.on("getTeamPreview", data => {

        const side =
            data.side;

        const teamName =
            teamNames[side];

        const teamData =
            playersData[teamName];

        socket.emit(
            "teamPreviewData",
            {
                side,
                teamName,
                teamData
            }
        );
    });

    // POKAŻ PYTANIE
    socket.on("showQuestion", () => {

        gameState.questionVisible = true;

        sendUpdate();
    });

    // START GRY
    socket.on("startGame", () => {

        loadRandomQuestion();

        sendUpdate();
    });

    // NOWE PYTANIE
    socket.on("newQuestion", () => {

        setTimeout(() => {

            loadRandomQuestion();

            sendUpdate();

        }, 100);
    });

    // ODSŁOŃ ODPOWIEDŹ
    socket.on("revealAnswer", i => {

        if (gameState.answers[i]) {

            gameState.answers[i].revealed =
                !gameState.answers[i].revealed;
        }

        sendUpdate();
    });

    // X
    socket.on("toggleX", key => {

        if (
            gameState.activeX.includes(key)
        ) {

            gameState.activeX =
                gameState.activeX.filter(
                    x => x !== key
                );

        } else {

            gameState.activeX.push(key);

            if (key.includes("left")) {
                gameErrors.left++;
            }

            if (key.includes("right")) {
                gameErrors.right++;
            }
        }

        sendUpdate();
    });

    // CLEAR X
    socket.on("clearX", () => {

        gameState.activeX = [];

        sendUpdate();
    });

    // UPDATE TEAM
    socket.on(
        "updateTeamName",
        ({ side, name }) => {

            teamNames[side] = name;

            sendUpdate();
        }
    );

    // ADD POINTS
    socket.on(
        "addPoints",
        ({ side, points }) => {

            if (side === "left") {

                gameState.teamPointsLeft += points;
            }

            if (side === "right") {

                gameState.teamPointsRight += points;
            }

            sendUpdate();
        }
    );

    // ZMIANA STATUSU PYTANIA
    socket.on(
        "updateQuestionStatus",
        ({ index, status }) => {

            if (
                usedQuestionsHistory[index]
            ) {

                usedQuestionsHistory[index].status =
                    status;
            }
        }
    );

    // GENERUJ PDF
    socket.on("generatePDF", () => {

        io.emit("gameStats", {

            leftTeam:
                teamNames.left,

            rightTeam:
                teamNames.right,

            leftPoints:
                gameState.teamPointsLeft,

            rightPoints:
                gameState.teamPointsRight,

            leftErrors:
                gameErrors.left,

            rightErrors:
                gameErrors.right,

            usedQuestions:
                usedQuestionsHistory
        });

        // RESET
        usedQuestions = [];

        usedQuestionsHistory = [];

        currentQuestionNumber = 0;

        gameState = {

            question: "",

            answers: [],

            teamPointsLeft: 0,

            teamPointsRight: 0,

            activeX: [],

            started: false,

            questionVisible: false,

            questionNumber: 0
        };

        teamNames = {

            left: "Drużyna 1",

            right: "Drużyna 2"
        };

        gameErrors = {

            left: 0,

            right: 0
        };

        sendUpdate();
    });

    // PIERWSZY UPDATE
    sendUpdate();
});

// START
server.listen(3000, "0.0.0.0", () => {

    console.log(
        "http://localhost:3000"
    );
});