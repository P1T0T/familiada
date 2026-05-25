const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const questions = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "questions.json"),
        "utf8"
    )
);

const playersData = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "players.json"),
        "utf8"
    )
);

let usedQuestions = [];
let usedQuestionsHistory = [];
let currentQuestionNumber = 0;

let gameErrors = {
    left: 0,
    right: 0
};

let teamNames = {
    left: "Drużyna 1",
    right: "Drużyna 2"
};

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

// LOSOWANIE PYTANIA
function loadRandomQuestion() {

    const keys =
        Object.keys(questions);

    const availableKeys =
        keys.filter(
            k => !usedQuestions.includes(k)
        );

    if (
        availableKeys.length === 0
    ) {

        gameState.question =
            "BRAK DOSTĘPNYCH PYTAŃ";

        gameState.answers = [];

        return;
    }

    const randomKey =
        availableKeys[
            Math.floor(
                Math.random()
                * availableKeys.length
            )
        ];

    const q =
        questions[randomKey];

    usedQuestions.push(
        randomKey
    );

    usedQuestionsHistory.push({

        key: randomKey,

        question: q.text,

        status: "ZATWIERDZONE"
    });

    currentQuestionNumber++;

    gameState.question =
        q.text;

    gameState.answers =
        q.answers.map(a => ({

            text: a.text,

            points: a.points,

            revealed: false
        }));

    gameState.activeX = [];

    gameState.started = true;

    gameState.questionVisible =
        false;

    gameState.questionNumber =
        currentQuestionNumber;
}

// RESET
function fullReset() {

    usedQuestions = [];

    usedQuestionsHistory = [];

    currentQuestionNumber = 0;

    gameErrors = {

        left: 0,

        right: 0
    };

    teamNames = {

        left: "Drużyna 1",

        right: "Drużyna 2"
    };

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
}

io.on("connection", socket => {

    socket.emit("update", {

        gameState: {

            ...gameState,

            usedQuestions:
                usedQuestionsHistory
        },

        teamNames
    });

    // START
    socket.on("startGame", () => {

        loadRandomQuestion();

        io.emit("update", {

            gameState: {

                ...gameState,

                usedQuestions:
                    usedQuestionsHistory
            },

            teamNames
        });
    });

    // NOWE PYTANIE
    socket.on("newQuestion", () => {

        loadRandomQuestion();

        io.emit("update", {

            gameState: {

                ...gameState,

                usedQuestions:
                    usedQuestionsHistory
            },

            teamNames
        });
    });

    // POKAŻ PYTANIE
    socket.on("showQuestion", () => {

        gameState.questionVisible =
            true;

        io.emit("update", {

            gameState: {

                ...gameState,

                usedQuestions:
                    usedQuestionsHistory
            },

            teamNames
        });
    });

    // ODSŁOŃ
    socket.on("revealAnswer", i => {

        if (
            gameState.answers[i]
        ) {

            gameState.answers[i].revealed =
                !gameState.answers[i].revealed;
        }

        io.emit("update", {

            gameState: {

                ...gameState,

                usedQuestions:
                    usedQuestionsHistory
            },

            teamNames
        });
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

            if (
                key.includes("left")
            ) {
                gameErrors.left++;
            }

            if (
                key.includes("right")
            ) {
                gameErrors.right++;
            }
        }

        io.emit("update", {

            gameState: {

                ...gameState,

                usedQuestions:
                    usedQuestionsHistory
            },

            teamNames
        });
    });

    // DRUŻYNY
    socket.on(
        "updateTeamName",
        ({ side, name }) => {

            teamNames[side] =
                name;

            io.emit("update", {

                gameState: {

                    ...gameState,

                    usedQuestions:
                        usedQuestionsHistory
                },

                teamNames
            });
        }
    );

    // PUNKTY
    socket.on(
        "addPoints",
        ({ side, points }) => {

            if (
                side === "left"
            ) {
                gameState.teamPointsLeft +=
                    points;
            }

            if (
                side === "right"
            ) {
                gameState.teamPointsRight +=
                    points;
            }

            io.emit("update", {

                gameState: {

                    ...gameState,

                    usedQuestions:
                        usedQuestionsHistory
                },

                teamNames
            });
        }
    );

    // STATUS PYTANIA
    socket.on(
        "updateQuestionStatus",
        ({ index, status }) => {

            if (
                usedQuestionsHistory[index]
            ) {

                usedQuestionsHistory[index].status =
                    status;
            }

            io.emit("update", {

                gameState: {

                    ...gameState,

                    usedQuestions:
                        usedQuestionsHistory
                },

                teamNames
            });
        }
    );

    // GENEROWANIE PDF
    socket.on(
        "resetGame",
        data => {

            io.emit(
                "gameStats",
                {

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
                        data?.usedQuestions
                        || usedQuestionsHistory
                }
            );
        }
    );

    // FINALNY RESET
    socket.on("finalReset", () => {

        fullReset();

        io.emit("update", {

            gameState: {

                ...gameState,

                usedQuestions:
                    usedQuestionsHistory
            },

            teamNames
        });
    });
});

server.listen(
    3000,
    "0.0.0.0",
    () =>
        console.log(
            "http://localhost:3000"
        )
);