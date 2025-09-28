/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat } from "@google/genai";

// --- DOM ELEMENT REFERENCES ---
const runsEl = document.getElementById('runs') as HTMLElement;
const wicketsEl = document.getElementById('wickets') as HTMLElement;
const oversEl = document.getElementById('overs') as HTMLElement;
const nextBallButton = document.getElementById('next-ball-button') as HTMLButtonElement;
const commentaryBox = document.querySelector('.commentary-box') as HTMLElement;

// --- STATE MANAGEMENT ---
interface MatchState {
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
    gameOver: boolean;
}

const state: MatchState = {
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    gameOver: false,
};

// --- GEMINI SETUP ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const chat: Chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: 'You are an excited and dramatic cricket commentator. Keep your commentary for each ball concise, to one or two sentences. Do not use markdown.',
    },
});

// --- CORE FUNCTIONS ---

/**
 * Updates the scoreboard in the DOM with the current match state.
 */
function updateScoreboard() {
    runsEl.textContent = state.runs.toString();
    wicketsEl.textContent = state.wickets.toString();
    oversEl.textContent = `${state.overs}.${state.balls}`;
}

/**
 * Handles the simulation and AI interaction for the next ball.
 */
async function handleNextBall() {
    if (state.gameOver) return;

    nextBallButton.disabled = true;
    nextBallButton.textContent = '...';

    // 1. Simulate the ball outcome
    const outcomes = [0, 1, 2, 4, 6, 'W'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    let eventDescription: string;

    // 2. Update match state based on outcome
    state.balls++;
    // FIX: Use a `typeof` check as a type guard to ensure `outcome` is a number before adding to `state.runs`.
    if (typeof outcome === 'number') {
        state.runs += outcome;
        eventDescription = `The batsman scores ${outcome} ${outcome === 1 ? 'run' : 'runs'}.`;
    } else {
        state.wickets++;
        eventDescription = `It's a wicket! The batsman is out.`;
    }

    if (state.balls === 6) {
        state.overs++;
        state.balls = 0;
    }

    // 3. Check for game over conditions
    if (state.wickets >= 10 || state.overs >= 20) {
        state.gameOver = true;
        eventDescription += ` That's the end of the innings! Final score: ${state.runs}/${state.wickets}.`;
    }

    // 4. Update the scoreboard UI immediately
    updateScoreboard();

    // 5. Generate and stream AI commentary
    try {
        const result = await chat.sendMessageStream({ message: eventDescription });

        const commentaryItem = document.createElement('p');
        commentaryItem.className = 'commentary-item';
        commentaryBox.appendChild(commentaryItem);
        
        // Add a small delay for a more natural feel
        await new Promise(resolve => setTimeout(resolve, 200));

        let fullText = '';
        for await (const chunk of result) {
            fullText += chunk.text;
            commentaryItem.textContent = fullText;
            // Auto-scroll to the latest comment
            commentaryBox.scrollTop = commentaryBox.scrollHeight;
        }

    } catch (error) {
        console.error(error);
        const errorItem = document.createElement('p');
        errorItem.className = 'commentary-item error';
        errorItem.textContent = 'Sorry, the commentator is having technical difficulties.';
        commentaryBox.appendChild(errorItem);
    } finally {
        // 6. Re-enable button
        if (state.gameOver) {
            nextBallButton.textContent = 'Innings Over';
            nextBallButton.disabled = true;
        } else {
            nextBallButton.textContent = 'Bowl Next Ball';
            nextBallButton.disabled = false;
        }
    }
}

// --- INITIALIZATION ---
nextBallButton.addEventListener('click', handleNextBall);
updateScoreboard(); // Initial render