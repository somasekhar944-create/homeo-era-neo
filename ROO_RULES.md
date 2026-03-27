# Immutable Rules for Roo

## General Quiz Module
*   **UI:** Subject and Topic MUST remain separate fields. No Timer should ever be added back.
*   **Functionality:** General Quiz should NOT have an Add to Vault button. Use PG Training for saving questions.

## AI Notes Module
*   **Content:** AI Notes must be text-only, using Markdown for headings, bold text, and tables for clarity. No Mermaid/Diagram code allowed.
*   **Content (Organon & Repertory):** Organon and Repertory notes must always include Authors and Years where applicable.
*   IMMUTABLE RULE: AI Notes must remain TEXT-ONLY. Never attempt to add Mermaid or visual diagrams again. This module is now considered stable and locked.

## PG Training Module
*   **Exams:** Exams must be Cumulative (Week 1 to N). Weekly exams: exactly 20 PYQs from Week 1 to N. Monthly exams: exactly 40 PYQs from Week 1 to N. Remaining questions from Gemini 2.5 Flash strictly within the same range.
*   **PG TRAINING EXAM MODULE IS LOCKED:** Do not modify trainingRoutes.js or PGTrainingPage.jsx exam logic under any circumstances. This is the final stable version.

## Backend Security
*   **JSON Parsing:** Always use the Regex JSON Cleaner before JSON.parse.

## AI Model
*   **Model:** Always use Gemini 2.5 Flash.
*   **STRICT MODEL LOCK:** Always use Gemini 2.5 Flash. Never revert to 2.0 or other versions.

## Server
*   **Port:** Server must always run on 5002.

## Confirmation
*   **Stable Module Changes:** Before changing any stable module, you MUST ask me: 'Doctor, this will change a stable part of the code. Proceed?'
