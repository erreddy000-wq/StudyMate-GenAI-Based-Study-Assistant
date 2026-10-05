# StudyMate — GenAI Study Assistant

## Run
1. Open this folder in VS Code.
2. Create a virtual environment if desired:
   `python -m venv venv`
3. Activate it.
4. Install dependencies:
   `pip install -r requirements.txt`
5. Copy `.env.example` to `.env`.
6. Put your OpenAI API key in `.env`:
   `OPENAI_API_KEY=your_openai_api_key_here`
7. Optionally change the model with `OPENAI_MODEL`.
8. Run:
   `python app.py`
9. Open the local Flask address shown in the terminal.

## Important
- The project intentionally does NOT include `studymate.db`.
- A new SQLite database is created automatically beside `app.py` on first run.
- Each account's attempts and chat history are isolated by user ID.
- Study Chat now uses the OpenAI API to generate responses dynamically instead of a predefined question/answer dictionary.
- The API key is read from `.env` and is never stored in the frontend.
- Never commit your real `.env` file or API key to Git.
- The interface uses only local HTML/CSS/JavaScript. No Chart.js or CDN is used.
- If you want a completely fresh database later, stop Flask and delete `studymate.db`; it will be recreated on the next run.

## Main features
- Registration and login
- Subject/topic/difficulty practice
- Requested questions displayed together
- Submit & Check All Answers
- Per-question scoring, feedback and answers
- SQLite progress tracking per account
- Native JavaScript canvas analytics
- OpenAI-powered Study Chat
- Responsive final-year-project UI
