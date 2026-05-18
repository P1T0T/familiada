const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const playersData = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "players.json"),
        "utf8"
    )
);

app.use(express.static("public"));

const questions = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "questions.json"),
        "utf8"
    )
);

let gameErrors = {

    left: 0,

    right: 0
};

// użyte pytania
let usedQuestions = [];

// historia pytań do PDF/statystyk
let usedQuestionsHistory = [];

let gameState = {
    question: "",
    answers: [],
    teamPointsLeft: 0,
    teamPointsRight: 0,
    activeX: [],
    started: false,
    questionVisible: false
};

let teamNames = {
    left: "Drużyna 1",
    right: "Drużyna 2"
};

// LOSOWANIE PYTANIA
function loadRandomQuestion() {

    const keys = Object.keys(questions);

    // reset użytych pytań gdy wszystkie zostały wykorzystane
    if (usedQuestions.length >= keys.length) {
        usedQuestions = [];
    }

    // pytania niewykorzystane
    const availableKeys =
        keys.filter(
            k => !usedQuestions.includes(k)
        );

    // losowanie
    const randomKey =
        availableKeys[
            Math.floor(
                Math.random() *
                availableKeys.length
            )
        ];

    // pobranie pytania
    const q = questions[randomKey];

    // zapis jako użyte
    usedQuestions.push(randomKey);

    // zapis do historii/statystyk
    usedQuestionsHistory.push({
        key: randomKey,
        question: q.text
    });

    // ustawienie pytania
    gameState.question = q.text;

    gameState.answers =
        q.answers.map(a => ({
            text: a.text,
            points: a.points,
            revealed: false
        }));

    gameState.activeX = [];

    gameState.started = true;

    gameState.questionVisible = false;
}

// SOCKET.IO
io.on("connection", socket => {

    socket.on("getTeamPreview", data => {

        const side = data.side;

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

    socket.on("showQuestion", () => {

        gameState.questionVisible = true;

        io.emit("update", {
            gameState,
            teamNames
        });
    });

    socket.emit("update", {
        gameState,
        teamNames
    });

    // START GRY
    socket.on("startGame", () => {

        loadRandomQuestion();

        io.emit("update", {
            gameState,
            teamNames
        });
    });

    // NOWE PYTANIE
    socket.on("newQuestion", () => {

        loadRandomQuestion();

        io.emit("update", {
            gameState,
            teamNames
        });
    });

    // ODSŁANIANIE ODPOWIEDZI
    socket.on("revealAnswer", i => {

        if (gameState.answers[i]) {

            gameState.answers[i].revealed =
                !gameState.answers[i].revealed;
        }

        io.emit("update", {
            gameState,
            teamNames
        });
    });

// BŁĘDY X
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

        // zliczanie błędów do statystyk
        if (key.includes("left")) {

            gameErrors.left++;
        }

        if (key.includes("right")) {

            gameErrors.right++;
        }
    }

    io.emit("update", {
        gameState,
        teamNames
    });


        io.emit("update", {
            gameState,
            teamNames
        });
    });

    // CZYSZCZENIE X
    socket.on("clearX", () => {

        gameState.activeX = [];

        io.emit("update", {
            gameState,
            teamNames
        });
    });

    // NAZWY DRUŻYN
    socket.on(
        "updateTeamName",
        ({ side, name }) => {

            teamNames[side] = name;

            io.emit("update", {
                gameState,
                teamNames
            });
        }
    );

    // DODAWANIE PUNKTÓW
    socket.on(
        "addPoints",
        ({ side, points }) => {

            if (side === "left") {
                gameState.teamPointsLeft += points;
            }

            if (side === "right") {
                gameState.teamPointsRight += points;
            }

            io.emit("update", {
                gameState,
                teamNames
            });
        }
    );

    // RESET GRY
    socket.on("resetGame", () => {

        // wysłanie statystyk
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

        // reset pytań
        usedQuestions = [];

        usedQuestionsHistory = [];

        // reset gry
        gameState = {

            question: "",

            answers: [],

            teamPointsLeft: 0,

            teamPointsRight: 0,

            activeX: [],

            started: false
        };

        // reset nazw
        teamNames = {

            left: "Drużyna 1",

            right: "Drużyna 2"
        };

        gameErrors = {

            left: 0,

            right: 0
        };

        io.emit("update", {
            gameState,
            teamNames
        });
    });
});

// START SERWERA
server.listen(3000, "0.0.0.0", () =>
    console.log(
        "http://localhost:3000"
    )
);