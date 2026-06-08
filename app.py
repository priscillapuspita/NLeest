import json
import os
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, render_template


BASE_DIR = Path(__file__).resolve().parent
STORIES_PATH = BASE_DIR / "data" / "stories.json"
WORD_EXAMPLES_PATH = BASE_DIR / "word_examples.json"

app = Flask(__name__)


def load_stories():
    with STORIES_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def load_word_examples():
    with WORD_EXAMPLES_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def story_for_day(stories, topic):
    topic_stories = [story for story in stories if story["topic"] == topic]
    if not topic_stories:
        return None

    day_number = date.today().toordinal()
    return topic_stories[day_number % len(topic_stories)]


@app.route("/")
@app.route("/verhaal/<slug>")
def index(slug=None):
    stories = load_stories()
    topics = ["true crime", "fictie", "entertainment", "nieuws"]
    initial_story = story_for_day(stories, topics[0])
    return render_template("index.html", topics=topics, initial_story_id=initial_story["id"])


@app.route("/api/stories")
def stories_api():
    return jsonify({"stories": load_stories()})


@app.route("/api/word-examples")
def word_examples_api():
    return jsonify({"examples": load_word_examples()})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host="0.0.0.0", port=port)
