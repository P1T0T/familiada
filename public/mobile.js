const socket = io();

const previewBtn =
    document.getElementById(
        "previewBtn"
    );

const teamPreview =
    document.getElementById(
        "teamPreview"
    );

const teamPreviewContent =
    document.getElementById(
        "teamPreviewContent"
    );

const backBtn =
    document.getElementById(
        "backBtn"
    );

// OTWÓRZ PODGLĄD
previewBtn.onclick = () => {

    // wyczyść stare dane
    teamPreviewContent.innerHTML =
        "";

    // pokaż panel
    teamPreview.style.display =
        "block";

    // pobierz LEWĄ drużynę
    socket.emit(
        "getTeamPreview",
        {
            side: "left"
        }
    );

    // pobierz PRAWĄ drużynę
    socket.emit(
        "getTeamPreview",
        {
            side: "right"
        }
    );
};

// POWRÓT
backBtn.onclick = () => {

    teamPreview.style.display =
        "none";

    teamPreviewContent.innerHTML =
        "";
};

// ODBIÓR DANYCH DRUŻYNY
socket.on(
    "teamPreviewData",
    data => {

        // brak danych
        if (!data.teamData) {

            teamPreviewContent.innerHTML += `

                <hr>

                <h1>
                    ${data.teamName}
                </h1>

                <p>
                    Brak danych drużyny.
                </p>
            `;

            return;
        }

        // dane drużyny
        teamPreviewContent.innerHTML += `

            <hr>

            <h1>
                ${data.teamName}
            </h1>

            <p>
                <b>Kapitan:</b>
                ${data.teamData.captain}
            </p>

            <p>
                <b>Kontakt:</b>
                ${data.teamData.contact}
            </p>

            <h2>
                Uczestnicy:
            </h2>

            <ul>

                ${data.teamData.players
                    .map(
                        p => `
                            <li>${p}</li>
                        `
                    )
                    .join("")}

            </ul>
        `;
    }
);

// LIVE UPDATE
socket.on(
    "update",
    ({ gameState }) => {

        const question =
            document.getElementById(
                "question"
            );

        const answers =
            document.getElementById(
                "answers"
            );

        // EKRAN POWITALNY
        if (!gameState.started) {

            question.textContent =
                "WITAMY W FAMILIADZIE";

            answers.innerHTML = "";

            previewBtn.style.display =
                "block";

            return;
        }

        // podczas gry ukryj przycisk
        previewBtn.style.display =
            "none";

        // pytanie
        question.textContent =
            gameState.question;

        // odpowiedzi
        answers.innerHTML = "";

        gameState.answers.forEach(
            (a, i) => {

                const div =
                    document.createElement(
                        "div"
                    );

                div.className =
                    "answer";

                div.textContent =
                    `${i + 1}. `
                    + a.text
                    + ` (${a.points})`;

                answers.appendChild(div);
            }
        );
    }
);